import fs from "node:fs";
import path from "node:path";

import { BOOKS, type Book } from "@/data/books";
import { hashPassword } from "@/lib/password";

/**
 * Tiny JSON-file database for Milestone 3 (auth + real listings). Lives in
 * `.data/` at the repo root — deliberately OUTSIDE `src/` so Turbopack's file
 * watcher never rebuilds when we write to it, and gitignored so checkpoints
 * don't carry user data. Swap for a real DB (SQLite/Postgres) in a later
 * milestone without touching any callers: every consumer goes through the
 * functions below.
 */
const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LISTINGS_FILE = path.join(DATA_DIR, "listings.json");

export type User = {
  name: string;
  email: string;
  school: string;
  passwordHash: string;
  createdAt: string;
};

/**
 * On hosts with a read-only disk (Vercel serverless), file writes fail — so
 * data falls back to these in-memory copies for the life of the server
 * instance. Cloud demo works fully; data resets when the instance recycles.
 * Local/production servers with a real disk never populate these.
 */
let memUsers: User[] | null = null;
let memListings: Book[] | null = null;

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback; // missing or corrupt file -> start fresh
  }
}

/** Returns false when the disk can't be written — caller switches to memory. */
function writeJson(file: string, data: unknown): boolean {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Users. On very first read the store seeds the demo account the user asked
 * for (gurkaranlol900@gmail.com / "123") — seeding in code, not as a checked-in
 * file, means the account survives a `git reset --hard checkpoint-1` too.
 */
export function getUsers(): User[] {
  if (memUsers) return memUsers;
  const existing = readJson<User[] | null>(USERS_FILE, null);
  // Re-seed on missing, corrupt, OR emptied file — the demo account must
  // always be able to log in.
  if (Array.isArray(existing) && existing.length > 0) return existing;
  const seeded: User[] = [
    {
      name: "Gurkaran",
      email: "gurkaranlol900@gmail.com",
      school: "Delhi Public School",
      passwordHash: hashPassword("123"),
      createdAt: new Date().toISOString(),
    },
  ];
  if (!writeJson(USERS_FILE, seeded)) memUsers = seeded;
  return seeded;
}

export function findUserByEmail(email: string) {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(user: User) {
  const users = getUsers();
  users.push(user);
  if (!writeJson(USERS_FILE, users)) memUsers = users;
}

/** Books listed by real signed-in users (the demo set stays in books.ts). */
export function getUserListings(): Book[] {
  const raw = memListings ?? readJson<unknown>(LISTINGS_FILE, []);
  if (!Array.isArray(raw)) return [];
  // Drop any hand-edited entry missing a field the UI renders — one bad row
  // in the JSON must never take down the whole marketplace.
  return raw.filter((b): b is Book => {
    const x = b as Partial<Book> | null;
    return (
      !!x &&
      typeof x === "object" &&
      typeof x.id === "string" &&
      typeof x.title === "string" &&
      typeof x.price === "number" &&
      typeof x.originalPrice === "number" &&
      typeof x.coverImage === "string" &&
      typeof x.condition === "string" &&
      typeof x.sellerName === "string"
    );
  });
}

export function addListing(book: Book) {
  const listings = getUserListings();
  listings.unshift(book); // newest first
  if (!writeJson(LISTINGS_FILE, listings)) memListings = listings;
}

/** One seller's own listings — powers the private profile portfolio. */
export function getListingsByEmail(email: string): Book[] {
  return getUserListings().filter(
    (b) => b.sellerEmail?.toLowerCase() === email.toLowerCase(),
  );
}

/**
 * Delete a listing, but ONLY if `ownerEmail` matches the seller on record.
 * Returns the removed book (so the caller can clean up its photo), or null
 * if it doesn't exist or isn't theirs.
 */
export function removeListing(id: string, ownerEmail: string): Book | null {
  const listings = getUserListings();
  const target = listings.find((b) => b.id === id);
  if (!target || target.sellerEmail?.toLowerCase() !== ownerEmail.toLowerCase()) {
    return null;
  }
  const remaining = listings.filter((b) => b.id !== id);
  if (!writeJson(LISTINGS_FILE, remaining)) memListings = remaining;
  return target;
}

/** Everything on the marketplace: fresh user listings first, then the demo set. */
export function getCatalog(): Book[] {
  return [...getUserListings(), ...BOOKS];
}

export function findBook(id: string) {
  return getCatalog().find((b) => b.id === id);
}

/** Homepage stats, computed over the FULL catalog so new listings move the numbers. */
export function getStats() {
  const catalog = getCatalog();
  const schools = new Set(catalog.map((b) => b.school));
  const sellers = new Set(catalog.map((b) => b.sellerName));
  const moneySaved = catalog.reduce(
    (sum, b) => sum + Math.max(0, b.originalPrice - b.price),
    0,
  );
  return {
    booksListed: catalog.length,
    activeStudents: sellers.size,
    moneySaved,
    schoolsConnected: schools.size,
  };
}
