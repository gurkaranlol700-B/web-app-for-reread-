import type { ReactNode } from "react";

/**
 * Shared shell for /terms and /privacy. Reuses the same eyebrow + serif
 * headline + hairline-rule rhythm as the rest of the marketing site, so legal
 * pages read as part of ReRead rather than a bolted-on template.
 */
export function LegalDocument({
  eyebrow,
  title,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-20 sm:px-10 sm:py-28">
      <span className="mono-label text-brand">{eyebrow}</span>
      <h1 className="mt-4 text-[clamp(2.4rem,6vw,4rem)] leading-[1.02]">
        {title}
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Last updated {lastUpdated}
      </p>

      <div className="border-border bg-accent/40 mt-10 border p-5 text-sm leading-relaxed">
        <p className="text-accent-foreground font-medium">
          Draft, not legal advice.
        </p>
        <p className="text-muted-foreground mt-1.5">
          This document was written to get ReRead to a reasonable, good-faith
          policy for launch — it is not a substitute for legal counsel.
          Because most people using ReRead are school students, often minors,
          it should be reviewed and finalized by a lawyer qualified in your
          jurisdiction (consumer-marketplace and data-protection law in
          particular) before real signups open.
        </p>
      </div>

      <div className="mt-14 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-medium [&_h2:first-child]:mt-0 [&_p]:text-muted-foreground [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:leading-relaxed [&_li::marker]:text-brand">
        {children}
      </div>
    </article>
  );
}
