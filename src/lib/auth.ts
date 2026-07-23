import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

import { findUserByEmail } from "@/lib/store";

/**
 * Cookie sessions, no external auth library. The cookie value is
 * `base64(payload).signature` where the signature is an HMAC of the payload
 * with a server-side secret — the browser can read its own cookie but cannot
 * forge one, because it can't produce a valid signature. httpOnly keeps
 * page JavaScript away from it entirely.
 */
const SESSION_COOKIE = "reread_session";
const SECRET = process.env.SESSION_SECRET ?? "reread-dev-only-secret";
const SESSION_DAYS = 7;

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export async function createSession(email: string) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_DAYS * 86_400_000 }),
  ).toString("base64url");
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export type SessionUser = {
  name: string;
  email: string;
  school: string;
  createdAt: string;
};

/** The logged-in user for this request, or null. Never exposes the password hash. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || sig !== sign(payload)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email?: string;
      exp?: number;
    };
    if (typeof data.exp !== "number" || data.exp < Date.now() || !data.email) return null;
    const user = findUserByEmail(data.email);
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      school: user.school,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}
