import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt — no external dependency.
 * Stored as "salt:hash" so each password gets its own random salt (two users
 * with the same password still end up with different hashes).
 */
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  // timingSafeEqual instead of === so comparison time leaks nothing.
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, "hex"));
}
