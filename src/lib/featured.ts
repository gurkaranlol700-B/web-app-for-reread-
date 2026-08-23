/**
 * Is a paid boost running right now?
 *
 * Lives in its own module — with no `server-only` guard — for two reasons:
 * both server and client components need it, and reading the clock is an
 * impure call that Next 16's React rules forbid inside a component body.
 * Calling it through a plain function keeps every caller honest.
 */
export function isBoostActive(featuredUntil: string | null | undefined): boolean {
  if (!featuredUntil) return false;
  const until = Date.parse(featuredUntil);
  return !Number.isNaN(until) && until > Date.now();
}
