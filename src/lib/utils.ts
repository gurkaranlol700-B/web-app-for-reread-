import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic PRNG (mulberry32). Used anywhere a component would otherwise
 * reach for Math.random() inside render (e.g. inside useMemo) -- the React
 * Compiler's purity rule flags Math.random() there because it makes the
 * "same input, same output" render contract untrue. A seeded generator keeps
 * the randomness while staying pure/idempotent.
 */
export function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
