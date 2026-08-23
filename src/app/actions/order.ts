"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import {
  cancelOrder,
  completeHandover,
  createOrder,
  getOrder,
  markOrderPaid,
} from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { createGatewayOrder, verifyPaymentSignature } from "@/lib/razorpay";
import { handoverSchema, parseForm } from "@/lib/validation";

/**
 * Checkout, in three server-side steps:
 *
 *   beginCheckout   -> our order + a gateway order  (price read from the DB)
 *   confirmPayment  -> signature verified, order marked paid, escrow holds it
 *   confirmHandover -> code matched, money released, commission booked
 *
 * Nothing here trusts a number that came from the browser. The buyer's device
 * chooses WHICH book, and nothing else.
 */

export type CheckoutState = {
  error?: string;
  orderId?: string;
  gatewayOrderId?: string;
  amountPaise?: number;
  keyId?: string;
  mode?: "razorpay" | "simulated";
};

export async function beginCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to buy this book." };

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return { error: "That book isn't available any more." };

  const gate = rateLimit(`checkout:${user.id}`, 10, 60_000);
  if (!gate.allowed) {
    return { error: `Too many attempts. Try again in ${gate.retryAfterSeconds}s.` };
  }

  const created = await createOrder(listingId, user.id);
  if (!created.ok) return { error: created.error };

  const gateway = await createGatewayOrder({
    amount: created.order.amount,
    receipt: created.order.id,
    notes: { listingId, buyerId: user.id },
  });

  return {
    orderId: created.order.id,
    gatewayOrderId: gateway.gatewayOrderId,
    amountPaise: gateway.amountPaise,
    keyId: gateway.keyId,
    mode: gateway.mode,
  };
}

export type ConfirmState = { error?: string };

/**
 * Called after Razorpay's checkout closes successfully.
 *
 * The signature check is the security boundary. Without it, a buyer could call
 * this action directly with invented ids and take a book for free — so a
 * missing or wrong signature is refused outright in gateway mode.
 */
export async function confirmPayment(
  _prev: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to continue." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await getOrder(orderId);
  if (!order) return { error: "That order doesn't exist." };
  if (order.buyerId !== user.id) return { error: "This isn't your order." };

  const mode = String(formData.get("mode") ?? "razorpay") === "simulated" ? "simulated" : "razorpay";

  if (mode === "razorpay") {
    const razorpayOrderId = String(formData.get("razorpayOrderId") ?? "");
    const razorpayPaymentId = String(formData.get("razorpayPaymentId") ?? "");
    const signature = String(formData.get("signature") ?? "");

    const valid =
      razorpayOrderId &&
      razorpayPaymentId &&
      signature &&
      verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature });

    if (!valid) return { error: "We couldn't verify that payment. You have not been charged." };

    await markOrderPaid(orderId, { razorpayOrderId, razorpayPaymentId, mode: "razorpay" });
  } else {
    await markOrderPaid(orderId, { mode: "simulated" });
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  redirect(`/orders/${orderId}`);
}

export type HandoverState = { error?: string; done?: boolean };

export async function confirmHandover(
  _prev: HandoverState,
  formData: FormData,
): Promise<HandoverState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to continue." };

  const parsed = parseForm(handoverSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  // A 6-digit code has a million combinations; without a limit a determined
  // seller could simply try them all.
  const gate = rateLimit(`handover:${parsed.data.orderId}`, 8, 300_000);
  if (!gate.allowed) {
    return { error: `Too many wrong codes. Try again in ${gate.retryAfterSeconds}s.` };
  }

  const result = await completeHandover(parsed.data.orderId, user.id, parsed.data.code);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/orders");
  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/browse");
  return { done: true };
}

export async function abandonOrder(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "");
  await cancelOrder(orderId, user.id);

  revalidatePath("/orders");
  revalidatePath("/browse");
  redirect("/orders");
}
