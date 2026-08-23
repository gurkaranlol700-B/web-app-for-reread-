"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { addAlert, removeAlert } from "@/lib/alerts";
import { toggleWishlist } from "@/lib/wishlist";
import { bookAlertSchema, parseForm } from "@/lib/validation";

export type WishlistState = { saved?: boolean; error?: string };

/** The heart on a book card. Returns the new state so the icon can fill in. */
export async function toggleSaved(
  _prev: WishlistState,
  formData: FormData,
): Promise<WishlistState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to save books." };

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return { error: "That book isn't available." };

  try {
    const saved = await toggleWishlist(user.id, listingId);
    revalidatePath("/wishlist");
    return { saved };
  } catch {
    return { error: "Couldn't save that — try again." };
  }
}

export type AlertState = { error?: string; done?: boolean };

export async function createAlert(_prev: AlertState, formData: FormData): Promise<AlertState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to set up an alert." };

  const parsed = parseForm(bookAlertSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await addAlert(user.id, parsed.data);
    revalidatePath("/wishlist");
    return { done: true };
  } catch {
    return { error: "Couldn't save that alert — try again." };
  }
}

export async function deleteAlert(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await removeAlert(user.id, String(formData.get("alertId") ?? ""));
  revalidatePath("/wishlist");
}
