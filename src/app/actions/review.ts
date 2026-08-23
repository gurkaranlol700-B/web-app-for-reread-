"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { leaveReview } from "@/lib/reviews";
import { parseForm, reviewSchema } from "@/lib/validation";

export type ReviewState = { error?: string; done?: boolean };

/** Step four of the pitch: after the handover, both sides rate each other. */
export async function submitReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to leave a review." };

  const parsed = parseForm(reviewSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  // Eligibility (was this really your completed order?) is enforced inside
  // leaveReview, next to the data it checks against.
  const result = await leaveReview({
    orderId: parsed.data.orderId,
    reviewerId: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/profile");
  revalidatePath("/browse");
  return { done: true };
}
