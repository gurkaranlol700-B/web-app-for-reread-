import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  Heart,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import { startChat } from "@/app/actions/chat";
import { BuyButton } from "@/components/marketplace/buy-button";
import { ConditionBadge } from "@/components/marketplace/condition-badge";
import { ShareButton } from "@/components/marketplace/share-button";
import { WishlistButton } from "@/components/marketplace/wishlist-button";
import { getDiscountPercent } from "@/data/books";
import { getCurrentUser } from "@/lib/auth";
import { PLUS_EARLY_ACCESS_HOURS, rupees } from "@/lib/pricing";
import { getReviewsFor } from "@/lib/reviews";
import { findBook, hoursUntilPublic, incrementViews, isEarlyAccessLocked } from "@/lib/store";
import { trackAndCountViewers } from "@/lib/viewers";
import { countWishlisters, isWishlisted } from "@/lib/wishlist";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await findBook(id);
  if (!book) return { title: "Book not found" };
  return {
    title: book.title,
    description: `${book.title} — ${book.condition} condition, ${rupees(book.price)} on ReRead. ${book.description.slice(0, 120)}`,
    openGraph: {
      title: book.title,
      description: `${book.condition} · ${rupees(book.price)} · ${book.school}`,
      images: book.coverImage ? [{ url: book.coverImage }] : undefined,
    },
  };
}

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);

  const book = await findBook(id);
  if (!book) notFound();

  const user = await getCurrentUser();

  const [viewers, saved, savedCount, reviews] = await Promise.all([
    trackAndCountViewers(book.id),
    user ? isWishlisted(user.id, book.id) : Promise.resolve(false),
    countWishlisters(book.id),
    book.sellerId ? getReviewsFor(book.sellerId, 3) : Promise.resolve([]),
  ]);

  // Fire and forget — the counter must never delay the page.
  void incrementViews(book.id);

  const isOwn = Boolean(user && user.id === book.sellerId);
  const locked = isEarlyAccessLocked(book, user);
  const hasDiscount = book.originalPrice > book.price;
  const sold = book.status === "sold";
  const reserved = book.status === "reserved";

  const unlockIn = hoursUntilPublic(book);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
      <Link
        href="/browse"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to library
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="bg-accent/30 border-border relative aspect-[4/5] overflow-hidden rounded-2xl border">
            <Image
              src={book.coverImage}
              alt={`Cover of ${book.title}`}
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-contain p-8"
              priority
            />
            {sold ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                <span className="rounded-full bg-white px-5 py-2 font-serif text-lg font-semibold text-black">
                  Sold
                </span>
              </div>
            ) : null}
          </div>

          {/* Honest social proof — both numbers are real counts, not decoration. */}
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Eye className="size-3.5" />
              {`${book.views} views`}
            </span>
            {savedCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <Heart className="size-3.5" />
                {`${savedCount} saved`}
              </span>
            ) : null}
            {viewers > 1 ? (
              <span className="text-brand flex items-center gap-1.5 font-medium">
                <Users className="size-3.5" />
                {`${viewers} students viewing right now`}
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ConditionBadge condition={book.condition} />
            <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
              {book.subject}
            </span>
            <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
              {book.className}
            </span>
          </div>

          <h1 className="mt-4 text-[clamp(1.9rem,4vw,2.75rem)] leading-tight font-medium">
            {book.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <p className="text-brand font-serif text-3xl font-semibold">{rupees(book.price)}</p>
            {hasDiscount ? (
              <>
                <p className="text-muted-foreground/60 text-lg line-through">
                  {rupees(book.originalPrice)}
                </p>
                <span className="bg-brand/10 text-brand rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {`Save ${getDiscountPercent(book)}% vs new`}
                </span>
              </>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}

          {/* ------------------------------------------------------- Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isOwn ? (
              <span className="border-border text-muted-foreground inline-flex h-12 flex-1 items-center justify-center rounded-full border px-6 text-sm font-semibold">
                This is your listing
              </span>
            ) : !user ? (
              <Link
                href={`/login?next=/books/${book.id}`}
                className="bg-brand text-brand-foreground inline-flex h-12 flex-1 items-center justify-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                Log in to buy or message
              </Link>
            ) : locked ? (
              <Link
                href="/plus"
                className="bg-brand text-brand-foreground inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                <Sparkles className="size-4" />
                {`Plus members can buy now — opens to everyone in ${unlockIn}h`}
              </Link>
            ) : sold ? (
              <span className="border-border text-muted-foreground inline-flex h-12 flex-1 items-center justify-center rounded-full border px-6 text-sm font-semibold">
                Already sold
              </span>
            ) : (
              <>
                <BuyButton
                  listingId={book.id}
                  price={book.price}
                  buyerName={user.name}
                  buyerEmail={user.email}
                  disabled={reserved}
                  disabledLabel="Reserved by another student"
                />
                <form action={startChat}>
                  <input type="hidden" name="listingId" value={book.id} />
                  <button
                    type="submit"
                    className="border-border hover:border-brand hover:text-brand inline-flex h-12 items-center gap-2 rounded-full border px-6 text-sm font-semibold transition-colors"
                  >
                    <MessageSquare className="size-4" />
                    Message seller
                  </button>
                </form>
              </>
            )}

            {user && !isOwn ? (
              <WishlistButton listingId={book.id} initialSaved={saved} size="lg" />
            ) : null}

            {/* Sharing is open to everyone, signed in or not — a link passed
                into a class WhatsApp group is the cheapest new visitor there
                is, and asking someone to log in first would kill it. */}
            <ShareButton title={book.title} price={book.price} path={`/books/${book.id}`} compact />
          </div>

          {isOwn ? (
            <div className="mt-4">
              <p className="text-muted-foreground mb-2 text-sm">
                Send it to your class group — most books sell to someone who
                already knows you.
              </p>
              <ShareButton title={book.title} price={book.price} path={`/books/${book.id}`} />
            </div>
          ) : null}

          {locked ? (
            <p className="border-brand/40 bg-brand/5 text-muted-foreground mt-4 rounded-xl border p-3 text-xs leading-relaxed">
              {`Brand-new listings go to ReRead Plus members first for ${PLUS_EARLY_ACCESS_HOURS} hours. Everyone else can see the book — they just can't claim it yet.`}
            </p>
          ) : null}

          {/* ------------------------------------------- How the money is held */}
          {!isOwn && !sold ? (
            <div className="border-border bg-card mt-6 rounded-2xl border p-4">
              <p className="text-brand flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4" />
                Your money is held until you have the book
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                Pay through ReRead and we hold the amount. Meet the seller, check
                the book, then read them your 6-digit code — only then does the
                money reach them. No code, no payout.
              </p>
            </div>
          ) : null}

          <div className="border-border bg-card mt-6 grid grid-cols-3 gap-4 rounded-2xl border p-5">
            <div>
              <p className="mono-label text-muted-foreground">Board</p>
              <p className="mt-1 font-medium">{book.board}</p>
            </div>
            <div>
              <p className="mono-label text-muted-foreground">Publication</p>
              <p className="mt-1 font-medium">{book.publication}</p>
            </div>
            <div>
              <p className="mono-label text-muted-foreground">Listed On</p>
              <p className="mt-1 font-medium">{book.listedOn}</p>
            </div>
          </div>

          <h2 className="mt-8 text-xl font-medium">About this book</h2>
          <p className="text-muted-foreground mt-2 leading-relaxed">{book.description}</p>

          {/* -------------------------------------------------------- Seller */}
          <h2 className="mt-8 text-xl font-medium">Seller</h2>
          <div className="border-border bg-card mt-3 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="bg-brand text-brand-foreground flex size-10 items-center justify-center rounded-full font-semibold">
                  {book.sellerInitial}
                </span>
                <div>
                  <p className="flex items-center gap-1.5 font-medium">
                    {book.sellerName}
                    {book.sellerIsVerified ? (
                      <BadgeCheck className="text-brand size-4" aria-label="Verified student" />
                    ) : null}
                  </p>
                  {book.sellerRatingCount ? (
                    <p className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Star className="fill-brand text-brand size-3.5" />
                      {`${book.sellerRating?.toFixed(1)} · ${book.sellerRatingCount} ${book.sellerRatingCount === 1 ? "review" : "reviews"}`}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">No reviews yet</p>
                  )}
                </div>
              </div>
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <MapPin className="size-3.5" />
                {book.school}
              </span>
            </div>

            {reviews.length > 0 ? (
              <ul className="border-border mt-4 space-y-3 border-t pt-4">
                {reviews.map((review) => (
                  <li key={review.id} className="text-sm">
                    <p className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`size-3 ${i < review.rating ? "fill-brand text-brand" : "text-muted-foreground/30"}`}
                        />
                      ))}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {review.reviewerName}
                      </span>
                    </p>
                    {review.comment ? (
                      <p className="text-muted-foreground mt-1 leading-relaxed">
                        {review.comment}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
