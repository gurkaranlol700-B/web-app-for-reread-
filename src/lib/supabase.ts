import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The one and only database handle, and it is SERVER ONLY.
 *
 * Everything in this app reads and writes Postgres from Server Components and
 * Server Actions using the `service_role` key, which bypasses Row Level
 * Security. That is safe precisely because this module can never reach the
 * browser — the `server-only` import above turns any accidental client-side
 * import into a build error rather than a leaked master key.
 *
 * The browser's only Supabase credential is the public `anon` key (used for
 * the realtime chat socket), and every table has RLS enabled with no policies,
 * so that key can read and write nothing.
 */
const URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";

let cached: SupabaseClient | null = null;

/** True when the database is configured. Lets callers degrade instead of crash. */
export function isDbConfigured(): boolean {
  return Boolean(process.env[URL_ENV] && process.env[KEY_ENV]);
}

export function db(): SupabaseClient {
  if (cached) return cached;

  const url = process.env[URL_ENV];
  const key = process.env[KEY_ENV];

  // Fail loudly and specifically. A vague "fetch failed" three layers deep at
  // 11pm the night before a pitch is the worst possible error message.
  if (!url || !key) {
    throw new Error(
      `Supabase is not configured — missing ${!url ? URL_ENV : KEY_ENV}. ` +
        `Add it to .env.local (local) and to Vercel -> Settings -> Environment Variables (live), ` +
        `then restart the server.`,
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "reread" } },
    realtime: { transport: nodeWebSocket() },
  });
  return cached;
}

/**
 * supabase-js builds a realtime client on construction and throws outright if
 * the runtime has no `WebSocket`. Node 22+ has one natively; Node 20 does not,
 * so the whole app would fail to start locally without this.
 *
 * The server never actually opens a realtime socket — only the browser chat
 * does — but the constructor still demands a transport, so `ws` is handed over
 * as a stand-in. On a runtime with native WebSocket this returns undefined and
 * supabase-js uses the built-in one.
 */
function nodeWebSocket(): typeof WebSocket | undefined {
  if (typeof WebSocket !== "undefined") return undefined;
  try {
    // Required lazily so bundlers don't pull `ws` in where it isn't needed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("ws") as unknown as typeof WebSocket;
  } catch {
    return undefined;
  }
}

/** Public storage bucket holding every book cover and school-ID upload. */
export const COVERS_BUCKET = "covers";

/** Public URL for a file already stored in the covers bucket. */
export function publicUrl(pathInBucket: string): string {
  return db().storage.from(COVERS_BUCKET).getPublicUrl(pathInBucket).data.publicUrl;
}
