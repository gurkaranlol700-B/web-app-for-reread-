"use client";

import { useState } from "react";
import { Check, Gift, Share2 } from "lucide-react";

import { REFERRAL_BOOST_CREDITS, REFERRAL_WALLET_CREDIT, rupees } from "@/lib/pricing";

/**
 * The growth loop.
 *
 * Both sides get something, which matters more than the size of the reward:
 * a one-sided referral asks a student to spam their friends for your benefit,
 * and they know it. A two-sided one lets them share something useful.
 */
export function ReferralCard({ code, boostCredits }: { code: string; boostCredits: number }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    // Origin has to be read at click time — this component renders on the
    // server first, where `window` doesn't exist.
    const link = `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
    const text = `Join me on ReRead — buy and sell school textbooks for ₹100–200 instead of full price. Use my code ${code} and we both get a bonus.`;

    // The native share sheet on a phone is the whole point; the clipboard is
    // the desktop fallback.
    if (navigator.share) {
      try {
        await navigator.share({ title: "ReRead", text, url: link });
        return;
      } catch {
        // Cancelled — fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-6">
      <Gift className="text-brand size-5" />
      <p className="text-brand mt-3 font-mono text-2xl font-semibold tracking-wider">{code}</p>
      <p className="mono-label text-muted-foreground mt-1">Your invite code</p>
      <p className="text-muted-foreground/80 mt-2 text-xs leading-relaxed">
        {`A friend signs up with it, they get ${rupees(REFERRAL_WALLET_CREDIT)} off their first book and you get ${REFERRAL_BOOST_CREDITS} free listing boost.`}
        {boostCredits > 0
          ? ` You have ${boostCredits} ${boostCredits === 1 ? "boost" : "boosts"} banked.`
          : ""}
      </p>

      <button
        type="button"
        onClick={share}
        className="border-border hover:border-brand hover:text-brand mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors"
      >
        {copied ? (
          <>
            <Check className="size-4" />
            Link copied
          </>
        ) : (
          <>
            {/* Always the same icon on first paint. Branching on
                `navigator.share` here would render differently on the server
                than on a phone and cause a real hydration mismatch. */}
            <Share2 className="size-4" />
            Share your invite
          </>
        )}
      </button>
    </div>
  );
}
