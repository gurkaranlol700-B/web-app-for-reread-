"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

function subscribeNever() {
  return () => {};
}
function getMountedSnapshot() {
  return true;
}
function getMountedServerSnapshot() {
  return false;
}

/**
 * Light/dark switch.
 *
 * The `mounted` guard matters: on the server we have no idea which theme the
 * student prefers, so rendering an icon immediately would produce different
 * HTML on the server and the client -- a hydration error. useSyncExternalStore
 * with mismatched server/client snapshots is React's own mechanism for this:
 * it renders the server snapshot (false) for the first pass, then
 * reconciles to the client snapshot (true) right after hydration, without
 * the "setState inside an effect" anti-pattern a mounted-state+effect would
 * be. Reserving the icon's space is what stops the navbar jumping.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    subscribeNever,
    getMountedSnapshot,
    getMountedServerSnapshot,
  );

  const isDark = resolvedTheme === "dark";
  // aria-label must stay in lockstep with the icon it describes -- both are
  // gated by `mounted`, otherwise the label alone (computed from
  // resolvedTheme, unknown on the server) hydration-mismatches even while
  // the icon itself renders correctly.
  const label = mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme";

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground rounded-full"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-[1.15rem]" />
        ) : (
          <Moon className="size-[1.15rem]" />
        )
      ) : null}
    </Button>
  );
}
