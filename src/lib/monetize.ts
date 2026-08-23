import "server-only";

import { notify } from "@/lib/notify";
import {
  AD_PLANS,
  BOOST_PLANS,
  PLUS_DURATION_DAYS,
  PLUS_MONTHLY_BOOST_CREDITS,
  PLUS_PRICE,
  rupees,
} from "@/lib/pricing";
import type { PurchaseIntent } from "@/lib/purchase-token";
import { bumpUser, findBook, findUserById, setFeaturedUntil, updateUser } from "@/lib/store";
import { db, isDbConfigured } from "@/lib/supabase";

/**
 * Revenue streams two, three and four: featured listings, advertising, and
 * ReRead Plus. (Stream one, commission, lives with the orders it comes from.)
 *
 * Every one of them ends the same way — an effect applied, and a row in
 * `payments`. That table is the single ledger the admin dashboard reads, so
 * "how much did ReRead make, and from what" has exactly one answer no matter
 * which product earned it.
 */

export type Ad = {
  id: string;
  advertiserName: string;
  headline: string;
  body: string;
  imageUrl: string | null;
  targetUrl: string;
  ctaLabel: string;
  budget: number;
  status: string;
  impressions: number;
  clicks: number;
  createdAt: string;
};

function mapAd(row: Record<string, unknown>): Ad {
  return {
    id: String(row.id),
    advertiserName: String(row.advertiser_name),
    headline: String(row.headline),
    body: String(row.body ?? ""),
    imageUrl: typeof row.image_url === "string" ? row.image_url : null,
    targetUrl: String(row.target_url),
    ctaLabel: String(row.cta_label ?? "Learn more"),
    budget: Number(row.budget) || 0,
    status: String(row.status),
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    createdAt: String(row.created_at),
  };
}

// ------------------------------------------------------------------- ledger

async function recordRevenue(input: {
  userId: string;
  kind: "featured" | "plus" | "ad";
  amount: number;
  listingId?: string | null;
  adId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  mode: "razorpay" | "simulated";
}): Promise<void> {
  await db().from("payments").insert({
    user_id: input.userId,
    kind: input.kind,
    amount: input.amount,
    listing_id: input.listingId ?? null,
    ad_id: input.adId ?? null,
    razorpay_order_id: input.razorpayOrderId ?? null,
    razorpay_payment_id: input.razorpayPaymentId ?? null,
    mode: input.mode,
  });
}

// ------------------------------------------------------- 2. featured listings

export function findBoostPlan(id: string) {
  return BOOST_PLANS.find((plan) => plan.id === id) ?? null;
}

/**
 * Put a listing at the top of the shelf.
 *
 * Boost time is ADDED to whatever is left rather than replacing it, so a
 * seller who boosts twice never loses days they already paid for.
 */
export async function applyBoost(input: {
  listingId: string;
  sellerId: string;
  days: number;
  amount: number;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  mode: "razorpay" | "simulated";
  /** Paid with a free Plus credit instead of money. */
  usedCredit?: boolean;
}): Promise<boolean> {
  const book = await findBook(input.listingId);
  if (!book || book.sellerId !== input.sellerId) return false;

  const existing = book.featuredUntil ? Date.parse(book.featuredUntil) : 0;
  const from = Math.max(Date.now(), Number.isNaN(existing) ? 0 : existing);
  const until = new Date(from + input.days * 86_400_000);

  await setFeaturedUntil(input.listingId, until);

  if (!input.usedCredit) {
    await recordRevenue({
      userId: input.sellerId,
      kind: "featured",
      amount: input.amount,
      listingId: input.listingId,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      mode: input.mode,
    });
  }

  await notify({
    userId: input.sellerId,
    kind: "system",
    title: "Your listing is boosted",
    body: `${book.title} now leads the shelf until ${until.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`,
    link: `/books/${input.listingId}`,
  });

  return true;
}

// ------------------------------------------------------------ 4. ReRead Plus

export async function applyPlus(input: {
  userId: string;
  currentExpiry: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  mode: "razorpay" | "simulated";
}): Promise<void> {
  // Renewing early extends rather than restarts — nobody should be punished
  // for subscribing again before their year runs out.
  const existing = input.currentExpiry ? Date.parse(input.currentExpiry) : 0;
  const from = Math.max(Date.now(), Number.isNaN(existing) ? 0 : existing);
  const expiry = new Date(from + PLUS_DURATION_DAYS * 86_400_000);

  await updateUser(input.userId, {
    is_plus: true,
    plus_expires_at: expiry.toISOString(),
  });
  await bumpUser(input.userId, "boost_credits", PLUS_MONTHLY_BOOST_CREDITS);

  await recordRevenue({
    userId: input.userId,
    kind: "plus",
    amount: PLUS_PRICE,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    mode: input.mode,
  });

  await notify({
    userId: input.userId,
    kind: "system",
    title: "Welcome to ReRead Plus",
    body: `Half commission, ${PLUS_MONTHLY_BOOST_CREDITS} free boosts, no ads, and first look at every new listing.`,
    link: "/profile",
  });
}

// ------------------------------------------------------------ 3. advertising

export function findAdPlan(id: string) {
  return AD_PLANS.find((plan) => plan.id === id) ?? null;
}

/** Created as `pending` — a campaign only runs once you approve it in /admin. */
export async function createAdDraft(input: {
  advertiserId: string;
  advertiserName: string;
  headline: string;
  body: string;
  targetUrl: string;
  ctaLabel: string;
  imageUrl: string | null;
  budget: number;
}): Promise<string | null> {
  const { data, error } = await db()
    .from("ads")
    .insert({
      advertiser_id: input.advertiserId,
      advertiser_name: input.advertiserName,
      headline: input.headline,
      body: input.body,
      target_url: input.targetUrl,
      cta_label: input.ctaLabel || "Learn more",
      image_url: input.imageUrl,
      budget: input.budget,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return String(data.id);
}

export async function activateAd(input: {
  adId: string;
  advertiserId: string;
  amount: number;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  mode: "razorpay" | "simulated";
}): Promise<void> {
  // Paid campaigns still wait for approval — ReRead decides what its students
  // get shown, not whoever paid last.
  await db().from("ads").update({ status: "pending" }).eq("id", input.adId);

  await recordRevenue({
    userId: input.advertiserId,
    kind: "ad",
    amount: input.amount,
    adId: input.adId,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    mode: input.mode,
  });

  await notify({
    userId: input.advertiserId,
    kind: "system",
    title: "Campaign received",
    body: `We're reviewing your ${rupees(input.amount)} campaign. It usually goes live within a few hours.`,
    link: "/advertise/dashboard",
  });
}

/** Ads to show in a browse grid. Plus members get none — that's the point. */
export async function getActiveAds(limit = 3): Promise<Ad[]> {
  if (!isDbConfigured()) return [];
  const { data, error } = await db()
    .from("ads")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(mapAd);
}

export async function getAdsByAdvertiser(advertiserId: string): Promise<Ad[]> {
  if (!isDbConfigured() || !advertiserId) return [];
  const { data, error } = await db()
    .from("ads")
    .select("*")
    .eq("advertiser_id", advertiserId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapAd);
}

export async function getAllAds(): Promise<Ad[]> {
  if (!isDbConfigured()) return [];
  const { data, error } = await db()
    .from("ads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map(mapAd);
}

export async function setAdStatus(adId: string, status: "active" | "paused" | "rejected") {
  await db().from("ads").update({ status }).eq("id", adId);
}

/** Counters are best-effort; an ad that fails to log a view still renders. */
export async function trackAdEvent(adId: string, kind: "impression" | "click"): Promise<Ad | null> {
  if (!isDbConfigured()) return null;
  try {
    const column = kind === "click" ? "clicks" : "impressions";
    const { data } = await db().from("ads").select("*").eq("id", adId).maybeSingle();
    if (!data) return null;
    await db()
      .from("ads")
      .update({ [column]: (Number(data[column]) || 0) + 1 })
      .eq("id", adId);
    return mapAd(data);
  } catch {
    return null;
  }
}

// --------------------------------------------------------- purchase dispatch

/**
 * Apply whatever a verified payment was for. One place, so every stream is
 * guaranteed to write its ledger row and none can be forgotten.
 */
export async function applyPurchase(
  intent: PurchaseIntent,
  payment: { razorpayOrderId?: string | null; razorpayPaymentId?: string | null },
): Promise<{ ok: boolean; redirectTo: string }> {
  const common = { ...payment, mode: intent.mode };

  if (intent.kind === "featured") {
    const ok = await applyBoost({
      listingId: intent.refId,
      sellerId: intent.userId,
      days: intent.days ?? 7,
      amount: intent.amount,
      ...common,
    });
    return { ok, redirectTo: `/books/${intent.refId}` };
  }

  if (intent.kind === "plus") {
    // Read the current expiry so an early renewal extends the year instead of
    // silently throwing away the months already paid for.
    const existing = await findUserById(intent.userId);
    await applyPlus({
      userId: intent.userId,
      currentExpiry: existing?.plusExpiresAt ?? null,
      ...common,
    });
    return { ok: true, redirectTo: "/profile" };
  }

  await activateAd({
    adId: intent.refId,
    advertiserId: intent.userId,
    amount: intent.amount,
    ...common,
  });
  return { ok: true, redirectTo: "/advertise/dashboard" };
}
