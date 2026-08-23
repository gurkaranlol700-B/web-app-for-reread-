"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";

import { submitReview, type ReviewState } from "@/app/actions/review";

const LABELS = ["", "Poor", "Not great", "Fine", "Good", "Excellent"];

/** Step four of the pitch: rate the person you just traded with. */
export function ReviewForm({ orderId, revieweeName }: { orderId: string; revieweeName: string }) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  if (state.done) {
    return (
      <div className="border-border bg-card rounded-2xl border p-6 text-center">
        <p className="font-serif text-xl italic">Thank you.</p>
        <p className="text-muted-foreground mt-2 text-sm">
          {`Your rating is now part of ${revieweeName}'s profile — that's how ReRead stays trustworthy.`}
        </p>
      </div>
    );
  }

  const shown = hovered || rating;

  return (
    <form action={formAction} className="border-border bg-card rounded-2xl border p-6">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="font-medium">{`How was your deal with ${revieweeName}?`}</p>

      <div className="mt-4 flex items-center gap-2" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} star${value > 1 ? "s" : ""}`}
            aria-pressed={rating === value}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHovered(value)}
            onFocus={() => setHovered(value)}
            className="focus-visible:ring-ring rounded-full p-1 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:outline-none"
          >
            <Star
              className={`size-8 transition-colors ${
                value <= shown ? "fill-brand text-brand" : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
        {shown ? (
          <span className="text-muted-foreground ml-2 text-sm">{LABELS[shown]}</span>
        ) : null}
      </div>

      <textarea
        name="comment"
        rows={3}
        maxLength={600}
        placeholder="Anything worth saying? Was the book as described? Were they on time? (optional)"
        className="border-border bg-background focus-visible:ring-ring mt-4 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none focus-visible:ring-2"
      />

      {state.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="bg-brand text-brand-foreground mt-4 inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sending…" : rating === 0 ? "Pick a rating first" : "Submit review"}
      </button>
    </form>
  );
}
