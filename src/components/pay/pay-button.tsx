"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import {
  beginPurchase,
  completePurchase,
  type CompleteState,
  type PurchaseState,
} from "@/app/actions/monetize";
import { rupees } from "@/lib/pricing";

let scriptPromise: Promise<boolean> | null = null;

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
    setTimeout(() => resolve(Boolean(window.Razorpay)), 8_000);
  });

  return scriptPromise;
}

type Props = {
  kind: "featured" | "plus" | "ad";
  refId?: string;
  planId?: string;
  amount: number;
  label: string;
  description: string;
  buyerName: string;
  buyerEmail: string;
  className?: string;
};

/**
 * One checkout button, used by boosts, ReRead Plus and ad campaigns.
 *
 * Same gateway-with-fallback behaviour as the book checkout: if Razorpay
 * can't load, the purchase completes through a local confirmation sheet and
 * is tagged as simulated in the ledger rather than failing in front of an
 * audience.
 */
export function PayButton({
  kind,
  refId = "",
  planId = "",
  amount,
  label,
  description,
  buyerName,
  buyerEmail,
  className,
}: Props) {
  const [purchase, beginAction, beginning] = useActionState<PurchaseState, FormData>(
    beginPurchase,
    {},
  );
  const [complete, completeAction] = useActionState<CompleteState, FormData>(
    completePurchase,
    {},
  );

  const completeRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState({
    token: "",
    razorpayOrderId: "",
    razorpayPaymentId: "",
    signature: "",
  });
  const [simulating, setSimulating] = useState(false);
  const [opening, setOpening] = useState(false);
  const [cancelled, setCancelled] = useState<string | null>(null);

  useEffect(() => {
    if (result.token) completeRef.current?.requestSubmit();
  }, [result]);

  useEffect(() => {
    if (!purchase.token || !purchase.gatewayOrderId) return;
    let aborted = false;

    (async () => {
      setOpening(true);
      setCancelled(null);

      const ready =
        purchase.mode === "razorpay" && purchase.keyId ? await loadRazorpay() : false;
      if (aborted) return;

      if (!ready || !window.Razorpay) {
        setOpening(false);
        setSimulating(true);
        return;
      }

      const razorpay = new window.Razorpay({
        key: purchase.keyId,
        amount: purchase.amountPaise,
        currency: "INR",
        name: "ReRead",
        description,
        order_id: purchase.gatewayOrderId,
        prefill: { name: buyerName, email: buyerEmail },
        theme: { color: "#1a3d2e" },
        handler: (response: Record<string, string>) => {
          setResult({
            token: purchase.token!,
            razorpayOrderId: response.razorpay_order_id ?? "",
            razorpayPaymentId: response.razorpay_payment_id ?? "",
            signature: response.razorpay_signature ?? "",
          });
        },
        modal: {
          ondismiss: () => {
            setOpening(false);
            setCancelled("Payment cancelled — nothing has been charged.");
          },
        },
      });

      razorpay.open();
      setOpening(false);
    })();

    return () => {
      aborted = true;
    };
  }, [purchase, buyerName, buyerEmail, description]);

  // A Plus member spending a free boost credit never reaches a payment screen.
  if (purchase.freeApplied) {
    return (
      <p className="text-brand text-sm font-semibold">
        Boost applied with one of your free Plus credits.
      </p>
    );
  }

  const busy = beginning || opening;

  return (
    <>
      <form action={beginAction}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="refId" value={refId} />
        <input type="hidden" name="planId" value={planId} />
        <button
          type="submit"
          disabled={busy}
          className={
            className ??
            "bg-brand text-brand-foreground inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          }
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Opening checkout…" : label}
        </button>
      </form>

      <form ref={completeRef} action={completeAction} className="hidden">
        <input type="hidden" name="token" value={result.token} />
        <input type="hidden" name="razorpayOrderId" value={result.razorpayOrderId} />
        <input type="hidden" name="razorpayPaymentId" value={result.razorpayPaymentId} />
        <input type="hidden" name="signature" value={result.signature} />
      </form>

      {purchase.error || complete.error || cancelled ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {purchase.error ?? complete.error ?? cancelled}
        </p>
      ) : null}

      {simulating && purchase.token ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm payment"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
        >
          <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 shadow-xl">
            <p className="mono-label text-brand">ReRead secure checkout</p>
            <p className="mt-3 font-serif text-3xl font-semibold">{rupees(amount)}</p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
            <p className="border-border text-muted-foreground mt-4 flex items-start gap-2 rounded-xl border border-dashed p-3 text-xs leading-relaxed">
              <ShieldCheck className="text-brand mt-0.5 size-3.5 shrink-0" />
              Offline mode — the payment gateway is unreachable, so this is
              recorded without a live charge.
            </p>
            <button
              type="button"
              onClick={() => {
                setSimulating(false);
                setResult({
                  token: purchase.token!,
                  razorpayOrderId: "",
                  razorpayPaymentId: "",
                  signature: "",
                });
              }}
              className="bg-brand text-brand-foreground mt-5 inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            >
              {`Pay ${rupees(amount)}`}
            </button>
            <button
              type="button"
              onClick={() => setSimulating(false)}
              className="text-muted-foreground hover:text-foreground mt-2 inline-flex h-10 w-full items-center justify-center text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
