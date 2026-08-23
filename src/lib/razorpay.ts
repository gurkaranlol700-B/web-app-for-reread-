import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Razorpay, running in TEST MODE.
 *
 * The integration is the real one — real orders, real checkout, real signature
 * verification. Only the key is a test key, so no real money moves. Going live
 * later is a change of two environment variables and nothing else.
 *
 * ── Why there is a simulated mode ──────────────────────────────────────────
 * This app gets demoed on a stage, on someone else's wifi, in front of judges.
 * If Razorpay is unreachable or the keys aren't set, `createGatewayOrder`
 * returns a simulated order instead of throwing, and the checkout component
 * runs a local confirmation flow. Every downstream step — the order record,
 * the escrow, the commission, the ledger — behaves identically and is tagged
 * `payment_mode: "simulated"` so the admin dashboard never lies about which
 * rupees were real.
 */

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

export function isGatewayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

export type PaymentMode = "razorpay" | "simulated";

export type GatewayOrder = {
  mode: PaymentMode;
  /** Razorpay order id (`order_...`), or a locally generated one when simulated. */
  gatewayOrderId: string;
  /** In paise — Razorpay's unit, and the reason we never do float maths on money. */
  amountPaise: number;
  currency: "INR";
  keyId: string;
};

/** Razorpay works in paise. ₹149 is 14900 — never 149.0. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Open an order with Razorpay. Falls back to a simulated order rather than
 * throwing — see the note at the top of this file.
 */
export async function createGatewayOrder(input: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<GatewayOrder> {
  const amountPaise = toPaise(input.amount);

  if (!isGatewayConfigured()) {
    return simulatedOrder(amountPaise);
  }

  try {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: input.receipt.slice(0, 40),
        notes: input.notes ?? {},
      }),
      // A gateway that hasn't answered in 8 seconds is a gateway that is not
      // going to answer before the judges notice.
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return simulatedOrder(amountPaise);

    const order = (await response.json()) as { id?: string };
    if (!order.id) return simulatedOrder(amountPaise);

    return {
      mode: "razorpay",
      gatewayOrderId: order.id,
      amountPaise,
      currency: "INR",
      keyId: RAZORPAY_KEY_ID,
    };
  } catch {
    return simulatedOrder(amountPaise);
  }
}

function simulatedOrder(amountPaise: number): GatewayOrder {
  return {
    mode: "simulated",
    gatewayOrderId: `sim_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
    amountPaise,
    currency: "INR",
    keyId: "",
  };
}

/**
 * Verify a completed checkout.
 *
 * Razorpay signs `order_id|payment_id` with your key secret. Checking that
 * signature is the whole point: without it, anyone could POST a made-up
 * payment id and get a book for free. Never mark an order paid on the
 * browser's word alone.
 */
export function verifyPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  if (!RAZORPAY_KEY_SECRET) return false;
  const expected = createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  return safeEqual(expected, input.signature);
}

/** Same idea, for the server-to-server webhook. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
