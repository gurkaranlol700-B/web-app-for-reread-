import "server-only";

import { cache } from "react";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

import { findUserById, findUserByEmail, type User } from "@/lib/store";

/**
 * Cookie sessions, no external auth library. The cookie value is
 * `base64(payload).signature` where the signature is an HMAC of the payload
 * with a server-side secret — the browser can read its own cookie but cannot
 * forge one, because it can't produce a valid signature. httpOnly keeps
 * page JavaScript away from it entirely.
 */
const SESSION_COOKIE = "reread_session";
const SESSION_DAYS = 30;

/**
 * The signing secret.
 *
 * In development it falls back to a shared constant so the app runs out of the
 * box. In production that fallback would be a hole big enough to drive a bus
 * through — the value is public, so anyone could mint a cookie for any
 * account, including the admin one. So production refuses to start without a
 * real secret rather than quietly running an insecure site.
 */
function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set. Without it, login cookies could be forged by anyone. " +
        "Add it in Vercel -> Settings -> Environment Variables (generate one with " +
        '`node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`).',
    );
  }
  return "reread-dev-only-secret";
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

/** Constant-time signature check — a plain `===` leaks timing information. */
function signatureMatches(payload: string, given: string): boolean {
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Whether to mark the cookie `Secure`.
 *
 * This must follow the ACTUAL protocol, not `NODE_ENV`. A production build
 * served over plain HTTP — which is exactly what happens when you open the
 * app from your phone at `http://192.168.x.x:3000` to test it — would set a
 * Secure cookie that the browser then refuses to send back, so login appears
 * to succeed and then silently does nothing. Vercel sets `x-forwarded-proto`,
 * so real HTTPS is still detected correctly there.
 */
async function isHttpsRequest(): Promise<boolean> {
  try {
    const headerList = await headers();
    const proto = headerList.get("x-forwarded-proto");
    if (proto) return proto.split(",")[0].trim() === "https";
    return false;
  } catch {
    return false;
  }
}

export async function createSession(user: { id: string; email: string }) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      exp: Date.now() + SESSION_DAYS * 86_400_000,
    }),
  ).toString("base64url");

  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: await isHttpsRequest(),
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, without the password hash. */
export type SessionUser = Omit<User, "passwordHash">;

function withoutSecret({ passwordHash, ...safe }: User): SessionUser {
  // `passwordHash` is destructured purely to drop it from the rest. Touching
  // it keeps the linter quiet without weakening the type.
  void passwordHash;
  return safe;
}

/**
 * The logged-in user for this request, or null.
 *
 * Wrapped in React's `cache` so the navbar, the page and any component that
 * asks all share ONE database round trip per request instead of three. On a
 * page like /browse that was three redundant profile lookups on every load.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [payload, sig] = token.split(".");
  if (!payload || !sig || !signatureMatches(payload, sig)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      id?: string;
      email?: string;
      exp?: number;
    };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;

    // Sessions issued before the Postgres migration only carry an email, so
    // fall back to it — nobody gets logged out by the upgrade.
    const user = data.id
      ? await findUserById(data.id)
      : data.email
        ? await findUserByEmail(data.email)
        : null;

    return user ? withoutSecret(user) : null;
  } catch {
    return null;
  }
});

/** Only this account can open /admin. */
export function isAdminEmail(email: string): boolean {
  const owner = (process.env.ADMIN_EMAIL ?? "gurkaranlol900@gmail.com").toLowerCase();
  return email.toLowerCase() === owner;
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return user.isAdmin || isAdminEmail(user.email) ? user : null;
}
