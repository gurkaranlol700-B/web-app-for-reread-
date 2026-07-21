import Link from "next/link";
import { Clock } from "lucide-react";

/**
 * Full-page gate for routes/actions that aren't built yet (auth, contact
 * seller, listing a book). Pattern copied from the reference build: a
 * calm "here's when, here's what you can still do" message rather than a
 * dead end -- the marketplace stays fully explorable even while a feature
 * is gated off.
 */
export function ComingSoon({
  feature,
  version,
  primaryCtaLabel = "Browse Books",
  primaryCtaHref = "/browse",
}: {
  feature: string;
  version: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-6 py-20 text-center">
      <div className="bg-accent/40 flex size-16 items-center justify-center rounded-2xl">
        <Clock className="text-brand size-7" />
      </div>

      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">Coming Soon</h1>
      <p className="text-muted-foreground mt-4 leading-relaxed">
        {feature} is arriving in <span className="text-brand font-semibold">Version {version}</span>.
        We&rsquo;re building something worth the wait.
      </p>

      <div className="border-border mt-8 flex w-full items-center gap-3">
        <span className="border-border flex-1 border-t" />
        <span className="mono-label text-muted-foreground">For now</span>
        <span className="border-border flex-1 border-t" />
      </div>

      <p className="text-muted-foreground mt-6 text-sm leading-relaxed">
        You can still browse and explore the marketplace freely.
      </p>

      <Link
        href={primaryCtaHref}
        className="bg-brand text-brand-foreground mt-6 inline-flex h-11 w-full items-center justify-center rounded-full px-7 text-sm font-semibold transition-opacity hover:opacity-90"
      >
        {primaryCtaLabel}
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
