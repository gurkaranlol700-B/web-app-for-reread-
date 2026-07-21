"use client";

import * as React from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * Tracks the OS-level "reduce motion" accessibility setting. Used by the 3D
 * scene to decide whether to mount WebGL at all. useSyncExternalStore rather
 * than state+effect: it's the API React actually designed for subscribing to
 * external mutable state (matchMedia here), and it keeps the component pure
 * during render instead of setting state as a side effect of mounting.
 */
export function usePrefersReducedMotion() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
