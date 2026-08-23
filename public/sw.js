/**
 * ReRead's service worker.
 *
 * Hand-written rather than generated. The popular Next.js PWA plugins don't
 * play well with Turbopack on Next 16, and a marketplace only needs three
 * behaviours anyway — which are much easier to reason about when they're
 * forty lines you can read than a generated Workbox bundle you can't.
 *
 * The rules, and why:
 *
 *  - HTML navigations are NETWORK ONLY, falling back to the offline page.
 *    They are never cached. Every page here is rendered for a specific signed
 *    in user — the navbar alone differs — so a cached copy is somebody's
 *    session frozen in amber. An earlier version did cache them, and the
 *    symptom was exactly what you'd expect: log in, open a book, and the page
 *    still says "Log in to buy". Freshness is not a nicety on a marketplace;
 *    a cached listing is a book that sold an hour ago.
 *  - Book covers and icons are CACHE FIRST. They never change under the same
 *    URL (Supabase Storage paths are content-addressed by listing id), and
 *    they are the heaviest thing on the page.
 *  - Everything else — API routes, server actions, POSTs — is left alone
 *    entirely. Caching a chat poll or a checkout would be actively harmful.
 */

// Bumping this purges every old cache on activate. It MUST be bumped whenever
// the caching rules change — v1 had cached authenticated HTML, and without a
// new version name those stale pages would outlive the fix.
const VERSION = "reread-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      // A failed precache must not block activation — the worker is still
      // useful without the offline page.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/covers/") ||
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|jpe?g|webp|svg|woff2?)$/i.test(url.pathname) ||
    // Supabase Storage — book covers uploaded by sellers.
    url.pathname.includes("/storage/v1/object/public/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever touch GETs. A cached POST would be a corrupted order.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept our own API routes — chat polling and notifications must
  // always hit the server.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      // Deliberately no caching of the response — see the note at the top.
      fetch(request).catch(
        async () => (await caches.match(OFFLINE_URL)) ?? Response.error(),
      ),
    );
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(ASSET_CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => undefined);
          }
          return response;
        });
      }),
    );
  }
});

/**
 * Web push. Fires for new messages and completed sales.
 * iOS delivers these only once the site has been added to the home screen.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "ReRead", body: "", link: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { link: payload.link },
      tag: payload.tag ?? undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Reuse an open ReRead tab rather than piling up new ones.
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
