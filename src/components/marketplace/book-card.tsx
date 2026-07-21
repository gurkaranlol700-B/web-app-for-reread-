"use client";

import Link from "next/link";
import { Eye, Heart, MapPin } from "lucide-react";

import { ConditionBadge } from "@/components/marketplace/condition-badge";
import type { Book } from "@/data/books";

/**
 * The marketplace's core unit, reused on the homepage's "Featured Editions"
 * and on /browse. No cover photo yet (real uploads are Milestone 3) — the
 * title stands in for the cover on a soft brand-tinted panel rather than
 * leaving a blank grey box.
 */
export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="border-border bg-card group focus-visible:ring-ring block overflow-hidden rounded-xl border transition-colors hover:border-brand/50 focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-accent/30 relative flex aspect-[4/3] items-center justify-center px-6">
        <div className="absolute top-3 left-3">
          <ConditionBadge condition={book.condition} />
        </div>
        <button
          type="button"
          aria-label="Save to wishlist"
          onClick={(e) => e.preventDefault()}
          className="bg-background/70 text-foreground hover:text-brand absolute top-3 right-3 flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
        >
          <Heart className="size-4" />
        </button>
        <span className="font-serif text-muted-foreground/70 text-center text-lg italic">
          {book.title}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif line-clamp-2 text-base leading-snug font-medium">
            {book.title}
          </h3>
          <span className="text-brand shrink-0 font-serif text-lg font-semibold">
            ₹{book.price}
          </span>
        </div>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {book.subject} • {book.className} • {book.board}
        </p>
        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
          <MapPin className="size-3.5" />
          {book.school}
        </p>

        <div className="border-border mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <span className="bg-brand text-brand-foreground flex size-6 items-center justify-center rounded-full text-xs font-semibold">
              {book.sellerInitial}
            </span>
            <span className="text-muted-foreground text-sm">{book.sellerName}</span>
          </div>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Eye className="size-3.5" />
            {book.views}
          </span>
        </div>
      </div>
    </Link>
  );
}
