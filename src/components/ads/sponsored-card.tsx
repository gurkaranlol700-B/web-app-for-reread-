import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import type { Ad } from "@/lib/monetize";

/**
 * A sponsored card in the shelf.
 *
 * It is labelled "Sponsored" plainly and it does not pretend to be a book.
 * Disguising ads as listings would earn a few more clicks and cost the trust
 * the entire marketplace runs on — a bad trade at any price.
 *
 * Clicks go through /api/ads/[id] so they can be counted server-side; the
 * advertiser's dashboard shows real numbers, not estimates.
 */
export function SponsoredCard({ ad, preview = false }: { ad: Ad; preview?: boolean }) {
  const inner = (
    <>
      <div className="bg-accent/30 relative flex aspect-[4/3] items-center justify-center">
        <span className="bg-background/80 text-muted-foreground absolute top-3 left-3 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold backdrop-blur-sm">
          Sponsored
        </span>
        {ad.imageUrl ? (
          <Image
            src={ad.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
            className="object-contain p-6"
          />
        ) : (
          <span className="text-brand/40 px-6 text-center font-serif text-2xl">
            {ad.advertiserName}
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-muted-foreground text-xs font-medium">{ad.advertiserName}</p>
        <h3 className="font-serif mt-1 line-clamp-2 text-base leading-snug font-medium">
          {ad.headline}
        </h3>
        {ad.body ? (
          <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm">{ad.body}</p>
        ) : null}
        <p className="text-brand border-border mt-3 flex items-center gap-1 border-t pt-3 text-sm font-semibold">
          {ad.ctaLabel}
          <ArrowUpRight className="size-3.5" />
        </p>
      </div>
    </>
  );

  const className =
    "border-border bg-card group block overflow-hidden rounded-xl border border-dashed transition-colors hover:border-brand/50";

  if (preview) return <div className={className}>{inner}</div>;

  return (
    <a
      href={`/api/ads/${ad.id}`}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
    >
      {inner}
    </a>
  );
}
