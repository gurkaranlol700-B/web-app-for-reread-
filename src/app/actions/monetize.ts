"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  applyBoost,
  applyPurchase,
  createAdDraft,
  findAdPlan,
  findBoostPlan,
  setAdStatus,
} from "@/lib/monetize";
import { PLUS_PRICE } from "@/lib/pricing";
import { createPurchaseToken, readPurchaseToken } from "@/lib/purchase-token";
import { rateLimit } from "@/lib/rate-limit";
import { createGatewayOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { bumpUser, findBook } from "@/lib/store";
import { uploadImage } from "@/lib/uploads";
import { adSchema, parseForm } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth";

/**
 * Checkout for boosts, Plus and ad campaigns.
 *
 * All three share one shape: `beginPurchase` decides the price server-side and
 * hands back a SIGNED intent; `completePurchase` verifies that signature plus
 * the gateway's, then applies the effect. The browser never gets to say what
 * something costs or what it bought.
 */

export type PurchaseState = {
  error?: string;
  token?: string;
  gatewayOrderId?: string;
  amountPaise?: number;
  keyId?: string;
  mode?: "razorpay" | "simulated";
  /** Set when a Plus member spent a free boost credit — no payment needed. */
  freeApplied?: boolean;
};

export async function beginPurchase(
  _prev: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to continue." };

  const gate = rateLimit(`purchase:${user.id}`, 15, 60_000);
  if (!gate.allowed) {
    return { error: `Too many attempts. Try again in ${gate.retryAfterSeconds}s.` };
  }

  const kind = String(formData.get("kind") ?? "");
  const refId = String(formData.get("refId") ?? "");
  const planId = String(formData.get("planId") ?? "");

  let amount = 0;
  let days: number | undefined;

  if (kind === "featured") {
    const plan = findBoostPlan(planId);
    if (!plan) return { error: "Pick a boost length." };

    const book = await findBook(refId);
    if (!book || book.sellerId !== user.id) return { error: "That isn't your listing." };

    // Plus members get free boosts. Spend a credit instead of charging them —
    // the benefit has to be real for the membership to be worth buying.
    if (user.boostCredits > 0) {
      await applyBoost({
        listingId: refId,
        sellerId: user.id,
        days: plan.days,
        amount: 0,
        mode: "simulated",
        usedCredit: true,
      });
      await bumpUser(user.id, "boost_credits", -1);
      revalidatePath("/browse");
      revalidatePath("/");
      revalidatePath(`/books/${refId}`);
      return { freeApplied: true };
    }

    amount = plan.price;
    days = plan.days;
  } else if (kind === "plus") {
    amount = PLUS_PRICE;
  } else if (kind === "ad") {
    const plan = findAdPlan(planId);
    if (!plan) return { error: "Pick a package." };
    amount = plan.price;
  } else {
    return { error: "Unknown purchase." };
  }

  const gateway = await createGatewayOrder({
    amount,
    receipt: `${kind}-${Date.now()}`,
    notes: { kind, refId, userId: user.id },
  });

  const token = createPurchaseToken({
    kind: kind as "featured" | "plus" | "ad",
    userId: user.id,
    refId,
    amount,
    days,
    gatewayOrderId: gateway.gatewayOrderId,
    mode: gateway.mode,
  });

  return {
    token,
    gatewayOrderId: gateway.gatewayOrderId,
    amountPaise: gateway.amountPaise,
    keyId: gateway.keyId,
    mode: gateway.mode,
  };
}

export type CompleteState = { error?: string };

export async function completePurchase(
  _prev: CompleteState,
  formData: FormData,
): Promise<CompleteState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to continue." };

  const intent = readPurchaseToken(String(formData.get("token") ?? ""));
  if (!intent) return { error: "That checkout expired. Please try again." };
  if (intent.userId !== user.id) return { error: "This isn't your purchase." };

  let razorpayOrderId: string | null = null;
  let razorpayPaymentId: string | null = null;

  if (intent.mode === "razorpay") {
    razorpayOrderId = String(formData.get("razorpayOrderId") ?? "");
    razorpayPaymentId = String(formData.get("razorpayPaymentId") ?? "");
    const signature = String(formData.get("signature") ?? "");

    // The payment must be for THIS intent's gateway order — otherwise a ₹29
    // boost receipt could be replayed against a ₹4,999 ad campaign.
    if (razorpayOrderId !== intent.gatewayOrderId) {
      return { error: "That payment doesn't match this purchase." };
    }
    if (!verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature })) {
      return { error: "We couldn't verify that payment. You have not been charged." };
    }
  }

  const result = await applyPurchase(intent, { razorpayOrderId, razorpayPaymentId });
  if (!result.ok) return { error: "Couldn't apply that purchase — please contact us." };

  revalidatePath("/", "layout");
  redirect(result.redirectTo);
}

// -------------------------------------------------------------- advertisers

export type AdDraftState = { error?: string };

/** Self-serve campaign creation. Payment happens on the next screen. */
export async function createCampaign(
  _prev: AdDraftState,
  formData: FormData,
): Promise<AdDraftState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advertise");

  const parsed = parseForm(adSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  const plan = findAdPlan(parsed.data.planId);
  if (!plan) return { error: "Pick a package." };

  let imageUrl: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const upload = await uploadImage(image, "ads", `ad-${Date.now()}`);
    if (!upload.ok) return { error: upload.error };
    imageUrl = upload.url;
  }

  const adId = await createAdDraft({
    advertiserId: user.id,
    advertiserName: parsed.data.advertiserName,
    headline: parsed.data.headline,
    body: parsed.data.body,
    targetUrl: parsed.data.targetUrl,
    ctaLabel: parsed.data.ctaLabel,
    imageUrl,
    budget: plan.price,
  });

  if (!adId) return { error: "Couldn't create that campaign — please try again." };

  redirect(`/advertise/pay/${adId}?plan=${plan.id}`);
}

/** Admin moderation of the ad queue. */
export async function moderateAd(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const adId = String(formData.get("adId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status === "active" || status === "paused" || status === "rejected") {
    await setAdStatus(adId, status);
  }

  revalidatePath("/admin");
  revalidatePath("/browse");
}
