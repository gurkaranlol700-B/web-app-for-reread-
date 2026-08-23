"use client";

import { useActionState, useOptimistic } from "react";
import { Heart } from "lucide-react";

import { toggleSaved, type WishlistState } from "@/app/actions/wishlist";

/**
 * The heart. Fills instantly on tap and reconciles when the server answers —
 * a save that takes 300ms to visibly register feels broken on a phone.
 */
export function WishlistButton({
  listingId,
  initialSaved,
  size = "sm",
}: {
  listingId: string;
  initialSaved: boolean;
  size?: "sm" | "lg";
}) {
  const [state, formAction] = useActionState<WishlistState, FormData>(toggleSaved, {
    saved: initialSaved,
  });

  const saved = state.saved ?? initialSaved;
  const [optimisticSaved, setOptimisticSaved] = useOptimistic<boolean, null>(
    saved,
    (current) => !current,
  );

  const large = size === "lg";

  return (
    <form
      action={(formData) => {
        setOptimisticSaved(null);
        formAction(formData);
      }}
      // Cards are wrapped in a <Link>; without this, saving a book navigates
      // to it instead.
      onClick={(e) => e.stopPropagation()}
    >
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        aria-label={optimisticSaved ? "Remove from wishlist" : "Save to wishlist"}
        aria-pressed={optimisticSaved}
        title={state.error ?? undefined}
        className={
          large
            ? "border-border hover:border-brand hover:text-brand flex size-12 items-center justify-center rounded-full border transition-colors"
            : "bg-background/70 text-foreground hover:text-brand flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
        }
      >
        <Heart
          className={`${large ? "size-5" : "size-4"} transition-colors ${
            optimisticSaved ? "fill-brand text-brand" : ""
          }`}
        />
      </button>
    </form>
  );
}
