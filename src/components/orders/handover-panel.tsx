"use client";

import { useActionState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { confirmHandover, type HandoverState } from "@/app/actions/order";

/**
 * The seller's half of the handover.
 *
 * The buyer reads six digits off their phone; the seller types them in. That
 * is the whole trust mechanism — the seller cannot be paid without the buyer
 * physically present and satisfied, and the buyer cannot take the book
 * without having already paid into escrow.
 */
export function HandoverPanel({ orderId, payout }: { orderId: string; payout: string }) {
  const [state, formAction, pending] = useActionState<HandoverState, FormData>(
    confirmHandover,
    {},
  );

  if (state.done) {
    return (
      <div className="border-brand/40 bg-brand/5 rounded-2xl border p-6 text-center">
        <p className="text-brand font-serif text-2xl font-semibold">{`${payout} released`}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Handover confirmed. Your balance has been updated — leave the buyer a
          rating below.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="border-border bg-card rounded-2xl border p-6">
      <input type="hidden" name="orderId" value={orderId} />

      <p className="text-brand flex items-center gap-2 text-sm font-semibold">
        <KeyRound className="size-4" />
        Enter the buyer&apos;s handover code
      </p>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        Meet the buyer, hand over the book, and let them check it. When they are
        happy, they will read you a 6-digit code. Type it here to release
        {` ${payout} `}
        into your balance.
      </p>

      <input
        name="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoComplete="off"
        placeholder="000000"
        aria-label="Six digit handover code"
        className="border-border bg-background focus-visible:ring-ring mt-4 w-full rounded-xl border px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none focus-visible:ring-2"
      />

      {state.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-brand-foreground mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Confirming…" : "Confirm handover & get paid"}
      </button>
    </form>
  );
}
