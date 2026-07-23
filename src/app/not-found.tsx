import Link from "next/link";
import { BookOpen } from "lucide-react";

/**
 * Branded 404 — reached for unknown URLs and for book pages whose listing no
 * longer exists (e.g. a link to a deleted listing). Keeps dead ends on-brand
 * instead of showing the stock Next.js 404.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      <div className="bg-accent/40 flex size-16 items-center justify-center rounded-2xl">
        <BookOpen className="text-brand size-7" />
      </div>

      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
        This page isn&rsquo;t on the shelf.
      </h1>
      <p className="text-muted-foreground mt-4 leading-relaxed">
        The link may be old, or the listing may have been taken down. The rest
        of the library is right where you left it.
      </p>

      <Link
        href="/browse"
        className="bg-brand text-brand-foreground mt-8 inline-flex h-11 w-full items-center justify-center rounded-full px-7 text-sm font-semibold transition-opacity hover:opacity-90"
      >
        Browse Books
      </Link>
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mt-4 text-sm transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
