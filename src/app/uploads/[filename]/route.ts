import fs from "node:fs";
import path from "node:path";

import { MEMORY_PHOTOS } from "@/lib/photo-cache";

/**
 * Serves seller-uploaded book photos in PRODUCTION.
 *
 * Why this exists: `next start` only serves /public files that were present
 * at build time — a photo uploaded while the server is running would 404.
 * This route reads the file from disk on every request instead, so listings
 * created after the build still show their photos. (In dev, /public wins and
 * this route is effectively never hit.)
 */
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Strict allowlist matching exactly the names createListing generates —
  // rules out path traversal and anything we didn't write ourselves.
  const match = /^user-\d+\.(jpg|png|webp)$/.exec(filename);
  if (!match) return new Response("Not found", { status: 404 });

  const file = path.join(process.cwd(), "public", "uploads", filename);
  try {
    const bytes = new Uint8Array(fs.readFileSync(file));
    return new Response(bytes, {
      headers: {
        "Content-Type": MIME[match[1]],
        // Filenames are unique per listing, so cache hard.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // Not on disk — read-only host (Vercel): the upload lives in memory.
    const cached = MEMORY_PHOTOS.get(filename);
    if (cached) {
      return new Response(cached.bytes, {
        headers: {
          "Content-Type": cached.type,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  }
}
