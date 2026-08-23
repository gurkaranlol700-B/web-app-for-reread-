import "server-only";

import type { PriceBand, PriceGuide } from "@/lib/price-band";
import { getAllListings } from "@/lib/store";

/**
 * "Books like this sell for ₹120–160."
 *
 * Sellers guess wildly when a price box is empty — some ask ₹450 for a book
 * nobody will buy, others give away a ₹900 book for ₹40. Both outcomes cost
 * ReRead a sale, so the guide is a revenue feature, not decoration.
 *
 * The numbers are the real 25th–75th percentile of what's actually on the
 * marketplace, per subject, with the whole catalogue as the fallback when a
 * subject is too thin to say anything honest about.
 *
 * The types and the `bandFor` lookup live in `price-band.ts` so the client
 * form can use them without importing this (server-only) query.
 */

/** Smallest sample we'll quote a subject-specific range from. */
const MIN_SAMPLE = 3;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index];
}

function band(prices: number[]): PriceBand {
  const sorted = [...prices].sort((a, b) => a - b);
  return {
    low: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    high: percentile(sorted, 0.75),
    sampleSize: sorted.length,
  };
}

export async function getPriceGuide(): Promise<PriceGuide> {
  const listings = await getAllListings();
  const prices = listings.map((b) => b.price).filter((p) => p > 0);

  const grouped = new Map<string, number[]>();
  for (const book of listings) {
    if (book.price <= 0) continue;
    const key = book.subject.toLowerCase();
    const bucket = grouped.get(key);
    if (bucket) bucket.push(book.price);
    else grouped.set(key, [book.price]);
  }

  const bySubject: Record<string, PriceBand> = {};
  for (const [subject, list] of grouped) {
    if (list.length >= MIN_SAMPLE) bySubject[subject] = band(list);
  }

  return {
    overall: band(prices.length ? prices : [100, 150, 200]),
    bySubject,
  };
}
