"use client";

import { useState } from "react";
import { Check, Send, Share2 } from "lucide-react";

/**
 * Share a listing.
 *
 * In an Indian school the entire second-hand book trade already happens in
 * WhatsApp groups — "anyone selling DK Goel?" is the whole market. So sharing
 * is not a nice-to-have here, it's the distribution channel, and every shared
 * link is a free new visitor.
 *
 * Three tiers, best first:
 *   1. `navigator.share` — the real OS share sheet on a phone, which puts
 *      WhatsApp at the front automatically.
 *   2. A wa.me link — desktop browsers have no share sheet, but WhatsApp Web
 *      still opens.
 *   3. Copy to clipboard — if even that is blocked, they still get the link.
 */
export function ShareButton({
  title,
  price,
  path,
  compact = false,
}: {
  title: string;
  price: number;
  path: string;
  /** Icon-only, for sitting beside the wishlist heart. */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function messageFor(url: string) {
    return `${title} — ₹${price.toLocaleString("en-IN")} on ReRead. ${url}`;
  }

  async function share() {
    // location is only readable in the browser, which is why this sits in a
    // handler rather than being computed during render.
    const url = `${window.location.origin}${path}`;
    const text = messageFor(url);

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // The user closed the sheet, or the browser refused. Fall through to
        // the options below rather than leaving the button feeling dead.
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
  }

  function whatsapp() {
    const url = `${window.location.origin}${path}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(messageFor(url))}`,
      "_blank",
      "noopener",
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={share}
        aria-label={copied ? "Link copied" : `Share ${title}`}
        className="border-border hover:border-brand hover:text-brand flex size-12 items-center justify-center rounded-full border transition-colors"
      >
        {copied ? <Check className="size-5 text-brand" /> : <Share2 className="size-5" />}
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={whatsapp}
        className="border-border hover:border-brand hover:text-brand inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors"
      >
        <Send className="size-4" />
        Send on WhatsApp
      </button>
      <button
        type="button"
        onClick={share}
        aria-label="Share this listing"
        className="border-border hover:border-brand hover:text-brand flex size-11 items-center justify-center rounded-full border transition-colors"
      >
        {copied ? <Check className="size-4 text-brand" /> : <Share2 className="size-4" />}
      </button>
    </div>
  );
}
