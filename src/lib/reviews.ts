import "server-only";

import { notify } from "@/lib/notify";
import { db, isDbConfigured } from "@/lib/supabase";
import { getOrder } from "@/lib/orders";

/**
 * Two-way reviews — step four of the pitch, and the reason anyone trusts a
 * stranger from another school enough to meet them.
 *
 * A review can only be written against a COMPLETED order you were part of.
 * That single rule is what separates a rating system from a comments section:
 * every star on ReRead is backed by a real transaction that really happened.
 */

export type Review = {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName?: string;
};

type Row = Record<string, unknown> & { reviewer?: { name?: unknown } | null };

function mapReview(row: Row): Review {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    reviewerId: String(row.reviewer_id),
    revieweeId: String(row.reviewee_id),
    rating: Number(row.rating) || 0,
    comment: String(row.comment ?? ""),
    createdAt: String(row.created_at),
    reviewerName: row.reviewer?.name ? String(row.reviewer.name) : undefined,
  };
}

const REVIEW_SELECT = `*, reviewer:profiles!reviews_reviewer_id_fkey ( name )`;

export type LeaveReviewResult = { ok: true } | { ok: false; error: string };

export async function leaveReview(input: {
  orderId: string;
  reviewerId: string;
  rating: number;
  comment: string;
}): Promise<LeaveReviewResult> {
  const order = await getOrder(input.orderId);
  if (!order) return { ok: false, error: "That order doesn't exist." };
  if (order.status !== "completed") {
    return { ok: false, error: "You can review once the handover is complete." };
  }

  const isBuyer = order.buyerId === input.reviewerId;
  const isSeller = order.sellerId === input.reviewerId;
  if (!isBuyer && !isSeller) return { ok: false, error: "This isn't your order." };

  const revieweeId = isBuyer ? order.sellerId : order.buyerId;

  const { error } = await db().from("reviews").insert({
    order_id: order.id,
    reviewer_id: input.reviewerId,
    reviewee_id: revieweeId,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment: input.comment.slice(0, 600),
  });

  if (error) {
    // The unique index on (order_id, reviewer_id) is doing its job.
    return { ok: false, error: "You've already reviewed this order." };
  }

  await recomputeRating(revieweeId);
  await notify({
    userId: revieweeId,
    kind: "review",
    title: `You got a ${input.rating}-star review`,
    body: input.comment ? `"${input.comment.slice(0, 90)}"` : "Tap to see it on your profile.",
    link: "/profile",
  });

  return { ok: true };
}

/**
 * Roll the average back onto the profile.
 *
 * Denormalised on purpose: a book card shows a seller's rating, and a browse
 * page shows twenty cards. Aggregating twenty times per page load to save one
 * column is the wrong trade.
 */
export async function recomputeRating(userId: string): Promise<void> {
  if (!isDbConfigured()) return;
  const { data } = await db().from("reviews").select("rating").eq("reviewee_id", userId);
  const ratings = (data ?? []).map((r) => Number(r.rating) || 0).filter(Boolean);

  const count = ratings.length;
  const avg = count ? ratings.reduce((a, b) => a + b, 0) / count : 0;

  await db()
    .from("profiles")
    .update({ rating_avg: Math.round(avg * 100) / 100, rating_count: count })
    .eq("id", userId);
}

export async function getReviewsFor(userId: string, limit = 20): Promise<Review[]> {
  if (!isDbConfigured() || !userId) return [];
  const { data, error } = await db()
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(mapReview);
}

/** Has this person already reviewed this order? Drives the "leave a review" prompt. */
export async function hasReviewed(orderId: string, reviewerId: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  const { count } = await db()
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("reviewer_id", reviewerId);
  return (count ?? 0) > 0;
}
