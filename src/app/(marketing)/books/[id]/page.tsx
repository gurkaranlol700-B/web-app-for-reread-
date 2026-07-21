import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MapPin, Share2 } from "lucide-react";

import { ConditionBadge } from "@/components/marketplace/condition-badge";
import { BOOKS, getBookById } from "@/data/books";

export function generateStaticParams() {
  return BOOKS.map((book) => ({ id: book.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = getBookById(id);
  return { title: book ? book.title : "Book not found" };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = getBookById(id);
  if (!book) notFound();

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
        <div className="bg-accent/30 border-border flex aspect-[4/5] items-center justify-center rounded-2xl border px-8">
          <span className="font-serif text-muted-foreground/70 text-center text-2xl italic">
            {book.title}
          </span>
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
          <p className="text-brand mt-2 font-serif text-3xl font-semibold">₹{book.price}</p>

          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/login"
              className="bg-brand text-brand-foreground inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
            >
              Contact Seller
            </Link>
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
                <p className="text-muted-foreground text-sm">Student</p>
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
