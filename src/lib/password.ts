import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt — no external dependency.
 * Stored as "salt:hash" so each password gets its own random salt (two users
 * with the same password still end up with different hashes).
 */
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, KEY_LENGTH).toString("hex")}`;
}

/**
 * Accounts created through Google or GitHub have no password at all. They get
 * this sentinel rather than a real hash, so `verifyPassword` can never
 * succeed for them no matter what is typed into a login form.
 */
export const NO_PASSWORD = "oauth-only";

export function verifyPassword(password: string, stored: string) {
  if (!stored || stored === NO_PASSWORD) return false;

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  try {
    const expected = Buffer.from(hash, "hex");
    // timingSafeEqual THROWS when the two buffers differ in length, which a
    // truncated or hand-edited hash in the database would cause — and an
    // uncaught throw here is a 500 on the login page rather than a clean
    // "wrong password". Check the length first, then compare in constant time.
    if (expected.length !== KEY_LENGTH) return false;
    return timingSafeEqual(scryptSync(password, salt, KEY_LENGTH), expected);
  } catch {
    return false;
  }
}
