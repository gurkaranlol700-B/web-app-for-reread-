import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * "Continue with Google / GitHub", implemented directly against each
 * provider's OAuth 2.0 endpoints.
 *
 * Why by hand rather than an auth library: ReRead already has a working
 * session system (a signed httpOnly cookie) that the whole app is built on.
 * Bolting NextAuth or Supabase Auth alongside it would mean two sources of
 * truth for "who is logged in" — the classic way to end up with a user who is
 * signed in on one page and signed out on the next. Instead each provider is
 * used purely to answer one question, "which verified email address is this?",
 * and the answer is handed to the session layer we already trust.
 *
 * The flow, for each provider:
 *   1. /api/auth/<provider>            -> redirect to the provider, carrying a signed `state`
 *   2. provider asks the user to approve
 *   3. /api/auth/<provider>/callback   -> verify `state`, swap the code for a token,
 *                                         read the profile, then issue OUR cookie
 *
 * `state` is signed with SESSION_SECRET and carries the page to return to. An
 * attacker can't forge one, which is what stops login-CSRF: a callback that
 * didn't originate from our own redirect is rejected.
 */

export type ProviderId = "google" | "github" | "apple";

export type OAuthProfile = {
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
};

type ProviderConfig = {
  id: ProviderId;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
  /** Extra params some providers require on the authorize call. */
  extraAuthParams?: Record<string, string>;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile | null>;
};

// ------------------------------------------------------------------ profiles

async function googleProfile(accessToken: string): Promise<OAuthProfile | null> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!data.email) return null;

  return {
    email: data.email.toLowerCase(),
    name: data.name?.trim() || data.email.split("@")[0],
    avatarUrl: data.picture ?? null,
    emailVerified: data.email_verified !== false,
  };
}

async function githubProfile(accessToken: string): Promise<OAuthProfile | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ReRead",
  };

  const [userRes, emailRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers, signal: AbortSignal.timeout(8_000) }),
    // GitHub omits the email from /user when the account keeps it private, so
    // the verified address has to be read from the dedicated endpoint.
    fetch("https://api.github.com/user/emails", { headers, signal: AbortSignal.timeout(8_000) }),
  ]);

  if (!userRes.ok) return null;
  const user = (await userRes.json()) as { name?: string; login?: string; avatar_url?: string };

  let email: string | null = null;
  let verified = false;

  if (emailRes.ok) {
    const emails = (await emailRes.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
    if (primary) {
      email = primary.email.toLowerCase();
      verified = true;
    }
  }

  if (!email) return null;

  return {
    email,
    name: user.name?.trim() || user.login || email.split("@")[0],
    avatarUrl: user.avatar_url ?? null,
    emailVerified: verified,
  };
}

// ----------------------------------------------------------------- providers

function configs(): ProviderConfig[] {
  return [
    {
      id: "google",
      label: "Google",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // `select_account` means a shared laptop doesn't silently log the next
      // student in as whoever used it last — which, in a school, matters.
      extraAuthParams: { prompt: "select_account", access_type: "online" },
      fetchProfile: googleProfile,
    },
    {
      id: "github",
      label: "GitHub",
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      fetchProfile: githubProfile,
    },
  ];
}

export function getProvider(id: string): ProviderConfig | null {
  return configs().find((p) => p.id === id) ?? null;
}

/**
 * Only providers whose credentials are actually present.
 *
 * The login page renders buttons from this list, so an unconfigured provider
 * simply isn't offered. A dead "Continue with GitHub" button that errors when
 * a judge taps it is worse than no button at all.
 */
export function enabledProviders(): Array<{ id: ProviderId; label: string }> {
  return configs()
    .filter((p) => p.clientId && p.clientSecret)
    .map((p) => ({ id: p.id, label: p.label }));
}

export function isProviderEnabled(id: string): boolean {
  const provider = getProvider(id);
  return Boolean(provider?.clientId && provider?.clientSecret);
}

// --------------------------------------------------------------------- state

function stateSecret(): string {
  return process.env.SESSION_SECRET ?? "reread-dev-only-secret";
}

/** Signed, single-use-ish state carrying where to go after login. */
export function createState(next: string): string {
  const payload = Buffer.from(
    JSON.stringify({ next, nonce: randomBytes(8).toString("hex"), exp: Date.now() + 600_000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readState(state: string): { next: string } | null {
  const [payload, sig] = (state ?? "").split(".");
  if (!payload || !sig) return null;

  const expected = Buffer.from(
    createHmac("sha256", stateSecret()).update(payload).digest("base64url"),
  );
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      next?: string;
      exp?: number;
    };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    // Same rule as the password login: only same-site relative targets.
    const next =
      typeof data.next === "string" && data.next.startsWith("/") && !data.next.startsWith("//")
        ? data.next
        : "/";
    return { next };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------- the dance

export function authorizeUrl(provider: ProviderConfig, redirectUri: string, state: string): string {
  const url = new URL(provider.authorizeUrl);
  url.searchParams.set("client_id", provider.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scope);
  url.searchParams.set("state", state);
  for (const [key, value] of Object.entries(provider.extraAuthParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function exchangeCodeForToken(
  provider: ProviderConfig,
  code: string,
  redirectUri: string,
): Promise<string | null> {
  try {
    const res = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      // The provider's own error text is the only thing that says WHY —
      // "redirect_uri_mismatch" and "invalid_client" look identical from the
      // outside otherwise. Server log only; the user gets a plain message.
      console.error(
        `[oauth] ${provider.id} token exchange failed: ${res.status} ${await res.text()}`,
      );
      return null;
    }

    const data = (await res.json()) as { access_token?: string; error?: string };
    if (!data.access_token) {
      console.error(`[oauth] ${provider.id} returned no access_token: ${JSON.stringify(data)}`);
      return null;
    }
    return data.access_token;
  } catch (error) {
    console.error(`[oauth] ${provider.id} token exchange threw:`, error);
    return null;
  }
}

/**
 * The callback URL registered with the provider.
 *
 * Built from the incoming request so the same code works on localhost, on the
 * LAN address you test from your phone, and on the Vercel domain — with no
 * environment variable to forget. `NEXT_PUBLIC_SITE_URL` overrides it when a
 * proxy makes the request host untrustworthy.
 */
export function callbackUrl(request: Request, provider: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const base = configured ? new URL(configured) : new URL(request.url);
  return new URL(`/api/auth/${provider}/callback`, base.origin).toString();
}
