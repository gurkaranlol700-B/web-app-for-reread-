import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Eye, MapPin, Sparkles, Star } from "lucide-react";

import { ConditionBadge } from "@/components/marketplace/condition-badge";
import { WishlistButton } from "@/components/marketplace/wishlist-button";
import { getDiscountPercent, type Book } from "@/data/books";
import { isBoostActive } from "@/lib/featured";
import { rupees } from "@/lib/pricing";

/**
 * The marketplace's core unit, reused on the homepage, /browse, /wishlist and
 * the profile shelf.
 *
 * Structure note: the card is NOT a <Link> wrapping everything, because the
 * wishlist heart is a real form button now and a button inside an anchor is
 * invalid HTML that browsers handle inconsistently. Instead the link is
 * stretched across the card behind the content, and the heart sits above it.
 */
export function BookCard({
  book,
  saved = false,
  showWishlist = true,
}: {
  book: Book;
  saved?: boolean;
  showWishlist?: boolean;
}) {
  const featured = isBoostActive(book.featuredUntil);
  const sold = book.status === "sold";
  const reserved = book.status === "reserved";

  return (
    <article
      className={`border-border bg-card group focus-within:ring-ring relative overflow-hidden rounded-xl border transition-colors focus-within:ring-2 ${
        featured ? "border-brand/60 shadow-[0_0_0_1px_var(--brand)]" : "hover:border-brand/50"
      }`}
    >
      {/* Stretched link: covers the whole card, sits under the heart. */}
      <Link
        href={`/books/${book.id}`}
        className="absolute inset-0 z-10 focus:outline-none"
        aria-label={book.title}
      />

      <div className="bg-accent/30 relative aspect-[4/3]">
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5">
          <ConditionBadge condition={book.condition} />
          {featured ? (
            <span className="bg-brand text-brand-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
              <Sparkles className="size-2.5" />
              Featured
            </span>
          ) : null}
        </div>

        {showWishlist ? (
          <div className="absolute top-3 right-3 z-20">
            <WishlistButton listingId={book.id} initialSaved={saved} />
          </div>
        ) : null}

        <Image
          src={book.coverImage}
          alt={`Cover of ${book.title}`}
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
          className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {sold || reserved ? (
          <div className="absolute inset-0 z-[15] flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black">
              {sold ? "Sold" : "Reserved"}
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif line-clamp-2 text-base leading-snug font-medium">
            {book.title}
          </h3>
          <div className="shrink-0 text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              {book.originalPrice > book.price ? (
                <span className="text-muted-foreground/60 text-xs line-through">
                  {rupees(book.originalPrice)}
                </span>
              ) : null}
              <span className="text-brand font-serif text-lg font-semibold">
                {rupees(book.price)}
              </span>
            </div>
            {book.originalPrice > book.price ? (
              <span className="text-brand mt-0.5 inline-block text-[0.65rem] font-semibold tracking-wide">
                {`Save ${getDiscountPercent(book)}%`}
              </span>
            ) : null}
          </div>
        </div>

        <p className="text-muted-foreground mt-1.5 text-sm">
          {`${book.subject} • ${book.className} • ${book.board}`}
        </p>
        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
          <MapPin className="size-3.5" />
          {book.school}
        </p>

        <div className="border-border mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="bg-brand text-brand-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {book.sellerInitial}
            </span>
            <span className="text-muted-foreground truncate text-sm">{book.sellerName}</span>
            {book.sellerIsVerified ? (
              <BadgeCheck className="text-brand size-3.5 shrink-0" aria-label="Verified student" />
            ) : null}
          </div>

          {book.sellerRatingCount ? (
            <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
              <Star className="fill-brand text-brand size-3" />
              {book.sellerRating?.toFixed(1)}
            </span>
          ) : (
            <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
              <Eye className="size-3.5" />
              {book.views}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
