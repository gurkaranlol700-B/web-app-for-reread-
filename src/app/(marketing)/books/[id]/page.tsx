import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, Mail, MapPin, Share2 } from "lucide-react";

import { ConditionBadge } from "@/components/marketplace/condition-badge";
import { BOOKS, getDiscountPercent } from "@/data/books";
import { getCurrentUser } from "@/lib/auth";
import { findBook } from "@/lib/store";

export function generateStaticParams() {
  // Demo books are known at build time; user listings render on demand.
  return BOOKS.map((book) => ({ id: book.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = findBook(id);
  return { title: book ? book.title : "Book not found" };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = findBook(id);
  if (!book) notFound();

  const user = await getCurrentUser();
  // Demo sellers have no real inbox — use the reserved example.com domain.
  const contactEmail =
    book.sellerEmail ?? `${book.sellerName.toLowerCase().replace(/\s+/g, ".")}@example.com`;
  const hasDiscount = book.originalPrice > book.price;

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
        <div className="bg-accent/30 border-border relative aspect-[4/5] overflow-hidden rounded-2xl border">
          <Image
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            fill
            sizes="(min-width: 1024px) 40vw, 90vw"
            className="object-contain p-8"
            priority
          />
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
            <p className="text-brand font-serif text-3xl font-semibold">
              ₹{book.price.toLocaleString("en-IN")}
            </p>
            {hasDiscount ? (
              <>
                <p className="text-muted-foreground/60 text-lg line-through">
                  ₹{book.originalPrice.toLocaleString("en-IN")}
                </p>
                <span className="bg-brand/10 text-brand rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {`Save ${getDiscountPercent(book)}% vs new`}
                </span>
              </>
            ) : null}
          </div>

          <div className="mt-6 flex items-center gap-3">
            {user ? (
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(`ReRead: ${book.title}`)}`}
                className="bg-brand text-brand-foreground inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                <Mail className="size-4" />
                Email Seller
              </a>
            ) : (
              <Link
                href={`/login?next=/books/${book.id}`}
                className="bg-brand text-brand-foreground inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                Log in to Contact Seller
              </Link>
            )}
            <button
              type="button"
              aria-label="Save to wishlist"
              className="border-border hover:border-brand hover:text-brand flex size-12 items-center justify-center rounded-full border transition-colors"
            >
              <Heart className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Share this listing"
              className="border-border hover:border-brand hover:text-brand flex size-12 items-center justify-center rounded-full border transition-colors"
            >
              <Share2 className="size-5" />
            </button>
          </div>

          <div className="border-border bg-card mt-8 grid grid-cols-3 gap-4 rounded-2xl border p-5">
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

          <h2 className="mt-8 text-xl font-medium">Seller Information</h2>
          <div className="border-border bg-card mt-3 flex items-center justify-between rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <span className="bg-brand text-brand-foreground flex size-10 items-center justify-center rounded-full font-semibold">
                {book.sellerInitial}
              </span>
              <div>
                <p className="font-medium">{book.sellerName}</p>
                <p className="text-muted-foreground text-sm">
                  {user ? contactEmail : "Student"}
                </p>
              </div>
            </div>
            <span className="text-muted-foreground flex items-center gap-1 text-sm">
              <MapPin className="size-3.5" />
              {book.school}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
