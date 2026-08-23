"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { updateUser } from "@/lib/store";
import { uploadImage, validateImage } from "@/lib/uploads";

export type VerifyState = { error?: string; done?: boolean };

/**
 * "Verified Student" — upload a school ID card, a human approves it.
 *
 * Deliberately not automatic. An email-domain check would be trivial to fake
 * and most Indian schools don't issue student email addresses anyway, so the
 * badge would mean nothing. A person looking at a card is slower and honest.
 */
export async function submitVerification(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in first." };

  const photo = validateImage(formData.get("idCard"));
  if (!photo.ok) return { error: photo.error };

  const upload = await uploadImage(photo.file, "verification", `id-${user.id}`);
  if (!upload.ok) return { error: upload.error };

  try {
    await updateUser(user.id, {
      verification_status: "pending",
      verification_doc_url: upload.url,
    });
  } catch {
    return { error: "Couldn't submit that — please try again." };
  }

  revalidatePath("/profile");
  return { done: true };
}

/** Admin approval of a pending verification. */
export async function decideVerification(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const userId = String(formData.get("userId") ?? "");
  const approve = String(formData.get("decision") ?? "") === "approve";

  await updateUser(userId, {
    verification_status: approve ? "approved" : "rejected",
  });

  await notify({
    userId,
    kind: "system",
    title: approve ? "You're a Verified Student" : "Verification not approved",
    body: approve
      ? "The badge now appears on all your listings — buyers trust verified sellers more."
      : "We couldn't read that ID clearly. Try again with a sharper photo.",
    link: "/profile",
  });

  revalidatePath("/admin");
  revalidatePath("/profile");
}
