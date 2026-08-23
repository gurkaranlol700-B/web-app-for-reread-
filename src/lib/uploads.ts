import "server-only";

import { COVERS_BUCKET, db, publicUrl } from "@/lib/supabase";

/**
 * Photo uploads, now in Supabase Storage instead of on the server's disk.
 *
 * The old version wrote to `public/uploads/` with `fs.writeFileSync`, which is
 * why the live site couldn't accept a listing at all: serverless filesystems
 * are read-only and every request may land on a different machine. Storage
 * fixes both problems — one bucket, one public URL, every instance sees it.
 */

/** Accepted image types, mapped to the extension we save with. */
const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

/**
 * 4MB, not 5. Vercel hard-rejects request bodies over roughly 4.5MB, so the
 * cap has to sit safely under that — a rejected upload at the wrong moment is
 * exactly the bug that made "the image won't upload" a real problem before.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type UploadResult = { ok: true; url: string; path: string } | { ok: false; error: string };

export function validateImage(file: unknown): { ok: true; file: File } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please upload a photo of the book." };
  }
  if (!IMAGE_EXT[file.type]) {
    return { ok: false, error: "The photo must be a JPG, PNG or WebP image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "The photo is too big — keep it under 4 MB." };
  }
  return { ok: true, file };
}

/**
 * Store one image and return its public URL.
 *
 * `folder` keeps covers and school-ID scans apart. The stored filename is
 * always one we generate — an uploaded name like `../../evil.sh` can never
 * influence where the file lands.
 */
export async function uploadImage(file: File, folder: string, id: string): Promise<UploadResult> {
  const check = validateImage(file);
  if (!check.ok) return check;

  const ext = IMAGE_EXT[file.type];
  const path = `${folder}/${id}.${ext}`;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await db()
      .storage.from(COVERS_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: true, cacheControl: "31536000" });

    if (error) return { ok: false, error: "Couldn't save the photo — please try again." };
    return { ok: true, url: publicUrl(path), path };
  } catch {
    return { ok: false, error: "Couldn't save the photo — please try again." };
  }
}

/** Best-effort cleanup when a listing is deleted. */
export async function deleteImage(urlOrPath: string): Promise<void> {
  if (!urlOrPath) return;
  const marker = `/${COVERS_BUCKET}/`;
  const index = urlOrPath.indexOf(marker);
  const path = index >= 0 ? urlOrPath.slice(index + marker.length) : urlOrPath;
  try {
    await db().storage.from(COVERS_BUCKET).remove([path]);
  } catch {
    // An orphaned image costs a few kilobytes; a thrown error costs the page.
  }
}
