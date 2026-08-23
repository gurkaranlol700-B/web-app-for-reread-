"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";

/**
 * Registers the service worker and offers to install the app.
 *
 * Two very different platforms to handle:
 *
 *  - Android/Chrome fires `beforeinstallprompt`, which we capture and replay
 *    when the student taps our own button. That button converts far better
 *    than the browser's own tiny address-bar hint.
 *  - iOS/Safari fires nothing and has no install API at all. The only route
 *    is Share -> Add to Home Screen, so on iOS we show those instructions
 *    instead of a button that couldn't do anything.
 *
 * Dismissal is remembered in localStorage so nobody is nagged twice.
 *
 * Implementation note: everything this component needs to know — whether the
 * app is already installed, whether it was dismissed, whether the browser
 * offered us an install prompt — lives OUTSIDE React, in the browser. So it's
 * read through `useSyncExternalStore` rather than copied into state from an
 * effect. That's not ceremony: reading it in an effect means the first paint
 * is always wrong and React has to render twice, which is exactly what Next
 * 16's rules flag.
 */

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "reread:install-dismissed";

/** What the prompt should currently show. */
type Mode = "hidden" | "ios" | "android";

// ---- the external store -----------------------------------------------------

let deferredEvent: InstallEvent | null = null;
let listeners: Array<() => void> = [];

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Private browsing can throw on access; treat that as "not dismissed".
    return false;
  }
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's non-standard flag for a home-screen app.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
}

/** Must return a primitive so repeated calls compare equal. */
function getMode(): Mode {
  if (isDismissed() || isInstalled()) return "hidden";
  if (deferredEvent) return "android";
  if (isIosSafari()) return "ios";
  return "hidden";
}

/** The server has no browser to ask, so it renders nothing. */
function getServerMode(): Mode {
  return "hidden";
}

// ---- the component ----------------------------------------------------------

export function InstallPrompt() {
  const mode = useSyncExternalStore(subscribe, getMode, getServerMode);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Register the service worker. Failures are silent on purpose — the site
    // works perfectly well without it, and an error toast about caching would
    // mean nothing to a student.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferredEvent = event as InstallEvent;
      emit();
    };
    const onInstalled = () => {
      deferredEvent = null;
      emit();
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do — they'll just see it again next visit.
    }
    deferredEvent = null;
    emit();
  }

  async function install() {
    if (!deferredEvent) return;
    setInstalling(true);
    try {
      await deferredEvent.prompt();
      await deferredEvent.userChoice;
    } finally {
      setInstalling(false);
      dismiss();
    }
  }

  if (mode === "hidden") return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm">
      <div className="border-border bg-card rounded-2xl border p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="bg-brand text-brand-foreground flex size-10 shrink-0 items-center justify-center rounded-xl font-serif text-xl font-medium italic">
            R
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Add ReRead to your phone</p>
            {mode === "ios" ? (
              <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1 text-sm leading-relaxed">
                Tap
                <Share className="inline size-3.5" aria-label="the Share button" />
                then <strong className="font-semibold">Add to Home Screen</strong>.
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Opens fullscreen like a real app, and works even on bad wifi.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {mode === "android" ? (
          <button
            type="button"
            onClick={install}
            disabled={installing}
            className="bg-brand text-brand-foreground mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Download className="size-4" />
            {installing ? "Installing…" : "Install ReRead"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
