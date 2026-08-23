import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A signed statement of what a payment was FOR.
 *
 * Boosts, Plus memberships and ad campaigns all follow the same two-step
 * shape: the server opens a gateway order, then the browser comes back and
 * says "that one succeeded". The obvious hole is the browser lying — claiming
 * a ₹99 Plus membership against a ₹29 boost payment, or against no payment at
 * all.
 *
 * So the intent (what, for whom, how much, against which gateway order) is
 * decided server-side, signed, and handed out as an opaque token. On the way
 * back we verify the signature before applying anything. A token can't be
 * edited, can't be reused for a different purchase, and expires.
 *
 * This is the same trick as the session cookie, applied to a shopping intent
 * rather than an identity — and it means no half-finished purchase rows have
 * to be stored and cleaned up.
 */

const SECRET = process.env.SESSION_SECRET ?? "reread-dev-only-secret";
const TTL_MS = 30 * 60_000;

export type PurchaseKind = "featured" | "plus" | "ad";

export type PurchaseIntent = {
  kind: PurchaseKind;
  userId: string;
  /** Listing id for a boost, plan id for Plus, ad id for a campaign. */
  refId: string;
  amount: number;
  /** Extra data the effect needs, e.g. how many days a boost lasts. */
  days?: number;
  gatewayOrderId: string;
  mode: "razorpay" | "simulated";
  exp: number;
};

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createPurchaseToken(intent: Omit<PurchaseIntent, "exp">): string {
  const payload = Buffer.from(
    JSON.stringify({ ...intent, exp: Date.now() + TTL_MS } satisfies PurchaseIntent),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readPurchaseToken(token: string): PurchaseIntent | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const intent = JSON.parse(Buffer.from(payload, "base64url").toString()) as PurchaseIntent;
    if (typeof intent.exp !== "number" || intent.exp < Date.now()) return null;
    return intent;
  } catch {
    return null;
  }
}
