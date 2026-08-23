"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { matchAlertsForListing } from "@/lib/alerts";
import { addListing, removeListing, type NewListing } from "@/lib/store";
import { deleteImage, uploadImage, validateImage } from "@/lib/uploads";
import { listingSchema, parseForm } from "@/lib/validation";

export type ListingFormState = { error?: string };

/** Pages whose content changes whenever the catalogue changes. */
const CATALOG_PATHS = ["/", "/browse", "/profile", "/leaderboard"];

function revalidateCatalog() {
  for (const path of CATALOG_PATHS) revalidatePath(path);
}

export async function createListing(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/sell");

  const parsed = parseForm(listingSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const form = parsed.data;

  // The seller agreement — checked here, on the server, so it can't be
  // skipped by editing the page in devtools.
  for (const term of ["agreeCondition", "agreeRefund", "agreeAccurate"] as const) {
    if (formData.get(term) !== "on") {
      return { error: "Please accept all three points of the seller agreement." };
    }
  }

  const photo = validateImage(formData.get("cover"));
  if (!photo.ok) return { error: photo.error };

  const id = `user-${Date.now()}`;

  const upload = await uploadImage(photo.file, "listings", id);
  if (!upload.ok) return { error: upload.error };

  const listing: NewListing = {
    id,
    sellerId: user.id,
    title: form.title,
    price: Math.round(form.price),
    originalPrice: Math.round(form.originalPrice ?? form.price),
    coverUrl: upload.url,
    condition: form.condition,
    subject: form.subject || "General",
    className: form.bookClass || "Class 12",
    board: form.board || "CBSE",
    publication: form.publication || "Not specified",
    description: form.description,
    school: user.school,
  };

  try {
    await addListing(listing);
  } catch {
    // The photo is already uploaded at this point; drop it so a failed
    // listing doesn't leave a file behind with nothing pointing at it.
    await deleteImage(upload.path);
    return { error: "Couldn't save your listing — please try again." };
  }

  // Anyone waiting for a book like this hears about it immediately. This is
  // what turns a wishlist into a sale.
  await matchAlertsForListing({
    id,
    title: listing.title,
    subject: listing.subject,
    className: listing.className,
    sellerId: user.id,
  });

  await notify({
    userId: user.id,
    kind: "system",
    title: "Your book is live",
    body: `${listing.title} is now on ReRead. Boost it to reach more students.`,
    link: `/books/${id}`,
  });

  revalidateCatalog();
  // Land the seller on their portfolio — the new book at the top of "My shelf".
  redirect("/profile");
}

/**
 * Remove one of YOUR listings (profile page only). Ownership is verified
 * inside `removeListing` — you can never delete someone else's book, even
 * with a hand-crafted request.
 */
export async function deleteListing(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const id = String(formData.get("id") ?? "");
  const removed = await removeListing(id, user.id);

  if (removed?.coverImage) await deleteImage(removed.coverImage);

  revalidateCatalog();
  redirect("/profile");
}
