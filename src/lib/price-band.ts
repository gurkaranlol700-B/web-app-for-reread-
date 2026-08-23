/**
 * Price-band types and the pure lookup, kept apart from the query that builds
 * them.
 *
 * The split exists because the sell form is a client component and needs
 * `bandFor` at runtime. Importing it from the server-only module would have
 * dragged the Supabase client — and the service-role key path — into the
 * browser bundle. The `server-only` guard caught exactly that.
 */

export type PriceBand = { low: number; high: number; median: number; sampleSize: number };

export type PriceGuide = {
  overall: PriceBand;
  bySubject: Record<string, PriceBand>;
};

/** Pick the most specific band we have enough data to stand behind. */
export function bandFor(guide: PriceGuide, subject: string): PriceBand {
  return guide.bySubject[subject.trim().toLowerCase()] ?? guide.overall;
}
