"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

import {
  beginCheckout,
  confirmPayment,
  type CheckoutState,
  type ConfirmState,
} from "@/app/actions/order";
import { rupees } from "@/lib/pricing";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<boolean> | null = null;

/** Load Razorpay's checkout once, and resolve false rather than hanging forever. */
function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
    // If the network is hostile, stop waiting and fall back to the local
    // confirmation sheet rather than leaving a spinner on screen.
    setTimeout(() => resolve(Boolean(window.Razorpay)), 8_000);
  });

  return scriptPromise;
}

type Props = {
  listingId: string;
  price: number;
  buyerName: string;
  buyerEmail: string;
  disabled?: boolean;
  disabledLabel?: string;
};

export function BuyButton({
  listingId,
  price,
  buyerName,
  buyerEmail,
  disabled,
  disabledLabel,
}: Props) {
  const [checkout, beginAction, beginning] = useActionState<CheckoutState, FormData>(
    beginCheckout,
    {},
  );
  const [confirm, confirmAction] = useActionState<ConfirmState, FormData>(confirmPayment, {});

  const confirmRef = useRef<HTMLFormElement>(null);
  const [payment, setPayment] = useState({
    orderId: "",
    razorpayOrderId: "",
    razorpayPaymentId: "",
    signature: "",
    mode: "razorpay" as "razorpay" | "simulated",
  });
  // Shown when the gateway is unreachable or unconfigured, so the purchase
  // flow can still be completed end to end.
  const [simulating, setSimulating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // Submitting the hidden form has to happen after React has written the new
  // values into the DOM, hence a state change rather than an inline submit.
  useEffect(() => {
    if (payment.orderId) confirmRef.current?.requestSubmit();
  }, [payment]);

  useEffect(() => {
    if (!checkout.orderId || !checkout.gatewayOrderId) return;

    let cancelled = false;

    (async () => {
      setOpening(true);
      setFailed(null);

      const useGateway = checkout.mode === "razorpay" && Boolean(checkout.keyId);
      const ready = useGateway ? await loadRazorpay() : false;
      if (cancelled) return;

      if (!ready || !window.Razorpay) {
        // No gateway available — complete the purchase locally instead.
        setOpening(false);
        setSimulating(true);
        return;
      }

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.amountPaise,
        currency: "INR",
        name: "ReRead",
        description: "Second-hand textbook",
        order_id: checkout.gatewayOrderId,
        prefill: { name: buyerName, email: buyerEmail },
        theme: { color: "#1a3d2e" },
        handler: (response: Record<string, string>) => {
          setPayment({
            orderId: checkout.orderId!,
            razorpayOrderId: response.razorpay_order_id ?? "",
            razorpayPaymentId: response.razorpay_payment_id ?? "",
            signature: response.razorpay_signature ?? "",
            mode: "razorpay",
          });
        },
        modal: {
          ondismiss: () => {
            setOpening(false);
            setFailed("Payment cancelled. The book is still yours to buy.");
          },
        },
      });

      razorpay.open();
      setOpening(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [checkout, buyerName, buyerEmail]);

  if (disabled) {
    return (
      <span className="border-border text-muted-foreground inline-flex h-12 flex-1 items-center justify-center rounded-full border px-6 text-sm font-semibold">
        {disabledLabel ?? "Unavailable"}
      </span>
    );
  }

  const busy = beginning || opening;

  return (
    <>
      <form action={beginAction} className="flex-1">
        <input type="hidden" name="listingId" value={listingId} />
        <button
          type="submit"
          disabled={busy}
          className="bg-brand text-brand-foreground inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Opening secure checkout…
            </>
          ) : (
            <>
              <Lock className="size-4" />
              {`Buy now · ${rupees(price)}`}
            </>
          )}
        </button>
      </form>

      {/* Submitted programmatically once a payment result exists. */}
      <form ref={confirmRef} action={confirmAction} className="hidden">
        <input type="hidden" name="orderId" value={payment.orderId} />
        <input type="hidden" name="razorpayOrderId" value={payment.razorpayOrderId} />
        <input type="hidden" name="razorpayPaymentId" value={payment.razorpayPaymentId} />
        <input type="hidden" name="signature" value={payment.signature} />
        <input type="hidden" name="mode" value={payment.mode} />
      </form>

      {checkout.error || confirm.error || failed ? (
        <p
          role="alert"
          className="mt-3 basis-full text-sm font-medium text-red-600 dark:text-red-400"
        >
          {checkout.error ?? confirm.error ?? failed}
        </p>
      ) : null}

      {simulating && checkout.orderId ? (
        <SimulatedCheckout
          amount={price}
          onCancel={() => setSimulating(false)}
          onPay={() => {
            setSimulating(false);
            setPayment({
              orderId: checkout.orderId!,
              razorpayOrderId: "",
              razorpayPaymentId: "",
              signature: "",
              mode: "simulated",
            });
          }}
        />
      ) : null}
    </>
  );
}

/**
 * The fallback payment sheet.
 *
 * It appears only when Razorpay can't be reached — no keys configured, no
 * network, a blocked script. Everything downstream (escrow, handover,
 * commission, the ledger) runs identically, and the resulting order is
 * recorded as `simulated` so the admin dashboard never counts pretend money
 * as real revenue.
 */
function SimulatedCheckout({
  amount,
  onPay,
  onCancel,
}: {
  amount: number;
  onPay: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm payment"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-xl">
        <p className="mono-label text-brand">ReRead secure checkout</p>
        <p className="mt-3 font-serif text-3xl font-semibold">{rupees(amount)}</p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Your payment is held by ReRead until you collect the book and confirm
          the handover with the seller.
        </p>

        <p className="border-border text-muted-foreground mt-4 flex items-start gap-2 rounded-xl border border-dashed p-3 text-xs leading-relaxed">
          <ShieldCheck className="text-brand mt-0.5 size-3.5 shrink-0" />
          Offline mode — the payment gateway is unreachable, so this transaction
          is recorded without a live charge.
        </p>

        <button
          type="button"
          onClick={onPay}
          className="bg-brand text-brand-foreground mt-5 inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
        >
          {`Pay ${rupees(amount)}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground mt-2 inline-flex h-10 w-full items-center justify-center text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
