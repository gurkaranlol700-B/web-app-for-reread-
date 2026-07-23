"use server";

import fs from "node:fs";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Book, Condition } from "@/data/books";
import { getCurrentUser } from "@/lib/auth";
import { addListing, removeListing } from "@/lib/store";

export type ListingFormState = { error?: string };

const CONDITIONS: Condition[] = ["New", "Like New", "Good", "Fair"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Whitelist of accepted photo types -> file extension we save with. The
// filename is always OUR generated id, never the uploaded name, so a
// malicious "../../evil.exe" filename can't escape /public/uploads.
const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function createListing(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/sell");

  const title = String(formData.get("title") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const bookClass = String(formData.get("bookClass") ?? "").trim();
  const board = String(formData.get("board") ?? "").trim();
  const publication = String(formData.get("publication") ?? "").trim() || "Not specified";
  const condition = String(formData.get("condition") ?? "") as Condition;
  const price = Number(formData.get("price"));
  const originalPriceRaw = String(formData.get("originalPrice") ?? "").trim();
  const originalPrice = originalPriceRaw ? Number(originalPriceRaw) : price;
  const description = String(formData.get("description") ?? "").trim();
  const cover = formData.get("cover");

  if (title.length < 3) return { error: "Please enter the book's name." };
  if (!CONDITIONS.includes(condition)) return { error: "Please pick the book's condition." };
  if (!Number.isFinite(price) || price < 10) return { error: "Price must be at least ₹10." };
  if (!Number.isFinite(originalPrice) || originalPrice < price) {
    return { error: "Original MRP can't be lower than your selling price." };
  }
  if (description.length < 10) {
    return { error: "Tell buyers a little about the book (at least 10 characters)." };
  }
  if (!(cover instanceof File) || cover.size === 0) {
    return { error: "Please upload a photo of the book." };
  }
  if (!IMAGE_EXT[cover.type]) return { error: "The photo must be a JPG, PNG or WebP image." };
  if (cover.size > MAX_IMAGE_BYTES) return { error: "The photo is too big — keep it under 5 MB." };

  // The seller agreement — server-side check so it can't be skipped by
  // editing the page. All three must be ticked.
  for (const term of ["agreeCondition", "agreeRefund", "agreeAccurate"] as const) {
    if (formData.get(term) !== "on") {
      return { error: "Please accept all three points of the seller agreement." };
    }
  }

  const id = `user-${Date.now()}`;
  const filename = `${id}.${IMAGE_EXT[cover.type]}`;

  const book: Book = {
    id,
    title,
    price: Math.round(price),
    originalPrice: Math.round(originalPrice),
    coverImage: `/uploads/${filename}`,
    condition,
    subject: subject || "General",
    className: bookClass || "Class 12",
    board: board || "CBSE",
    publication,
    description,
    listedOn: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    school: user.school,
    sellerName: user.name,
    sellerInitial: user.name.charAt(0).toUpperCase(),
    sellerEmail: user.email,
    views: 0,
  };
  // Disk writes are the only part that can genuinely fail — if they do, the
  // seller gets a friendly retry message instead of a crashed page.
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(await cover.arrayBuffer()));
    addListing(book);
  } catch {
    return { error: "Couldn't save your listing — please try again." };
  }

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/profile");
  // Land the seller on their portfolio — the new book at the top of "My shelf".
  redirect("/profile");
}

/**
 * Remove one of YOUR listings (profile page only). Ownership is verified
 * server-side — you can never delete someone else's book, even with a
 * hand-crafted request.
 */
export async function deleteListing(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const id = String(formData.get("id") ?? "");
  const removed = removeListing(id, user.email);

  if (removed && removed.coverImage.startsWith("/uploads/")) {
    try {
      fs.unlinkSync(path.join(process.cwd(), "public", removed.coverImage.slice(1)));
    } catch {
      // Photo file already gone — the listing itself is what matters.
    }
  }

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/profile");
  redirect("/profile");
}
