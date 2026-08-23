import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Logo } from "@/components/layout/logo";

export const metadata = { title: "You're offline" };

/**
 * Served by the service worker when a navigation fails.
 *
 * Deliberately outside the (marketing) group: the navbar is an async Server
 * Component that reads the session, and this page has to be a fully static
 * document the worker can cache once and hand out with no network at all.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo size="lg" />
      <WifiOff className="text-brand mt-10 size-8" />
      <h1 className="mt-6 text-[clamp(1.8rem,4vw,2.5rem)] leading-tight">
        You&apos;re offline.
      </h1>
      <p className="text-muted-foreground mx-auto mt-3 max-w-sm leading-relaxed">
        ReRead needs a connection to show you live listings — prices and
        availability change by the hour, and stale ones would waste your time.
      </p>
      <Link
        href="/"
        className="bg-brand text-brand-foreground mt-8 inline-flex h-12 items-center rounded-full px-8 text-sm font-semibold transition-opacity hover:opacity-90"
      >
        Try again
      </Link>
    </div>
  );
}
