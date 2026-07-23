"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

/**
 * Branded error boundary — if anything on a page throws, visitors see this
 * calm recovery screen (with the navbar still in place) instead of a raw
 * "Application error" page. `reset()` re-renders the page in place.
 */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      <div className="bg-accent/40 flex size-16 items-center justify-center rounded-2xl">
        <RefreshCw className="text-brand size-7" />
      </div>

      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">A page hiccup.</h1>
      <p className="text-muted-foreground mt-4 leading-relaxed">
        Something went wrong loading this page — your books and account are
        safe. Try again, or head back to the shelf.
      </p>

      <button
        type="button"
        onClick={reset}
        className="bg-brand text-brand-foreground mt-8 inline-flex h-11 w-full items-center justify-center rounded-full px-7 text-sm font-semibold transition-opacity hover:opacity-90"
      >
        Try again
      </button>
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mt-4 text-sm transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
