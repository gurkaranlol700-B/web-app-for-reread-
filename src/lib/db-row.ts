import "server-only";

/**
 * Small readers for rows coming back from PostgREST.
 *
 * Supabase types a `select()` result loosely, and embedded relations
 * (`seller:profiles(...)`) arrive as nested objects it can't narrow. Rather
 * than paper over that with `any` — which switches off type checking for
 * every property access downstream — every field is read through one of
 * these, which coerce and default explicitly.
 *
 * The cost is a little ceremony at the mapping layer. The benefit is that a
 * renamed column shows up as a wrong value in one mapper instead of an
 * undefined halfway down a page render.
 */
export type Row = Record<string, unknown>;

export function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function num(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function bool(value: unknown): boolean {
  return value === true;
}

/** A nullable string column — `null` rather than `""` when it's genuinely unset. */
export function nullableStr(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** An embedded relation, e.g. `seller:profiles!fk ( name )`. */
export function rel(row: Row, key: string): Row {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

/** True when the relation was actually present, not just defaulted to {}. */
export function hasRel(row: Row, key: string): boolean {
  const value = row[key];
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
