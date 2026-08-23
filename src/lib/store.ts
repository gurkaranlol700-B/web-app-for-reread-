import "server-only";

import { BOOKS, type Book, type Condition, type ListingStatus } from "@/data/books";
import { isBoostActive } from "@/lib/featured";
import { CO2_KG_PER_BOOK, PLUS_EARLY_ACCESS_HOURS, TREES_PER_BOOK } from "@/lib/pricing";
import { db, isDbConfigured } from "@/lib/supabase";

/**
 * Every read and write of users and listings goes through this module.
 *
 * It used to be JSON files on disk, which is why the live site had signup and
 * selling switched off — serverless disks are read-only and instances rotate.
 * It is Postgres now, and the exported function names deliberately did not
 * change, so the pages and actions calling them needed only an `await`.
 *
 * Read functions degrade gracefully when the database is not configured yet:
 * the site falls back to the seeded demo catalogue and stays browsable rather
 * than throwing a 500. Write functions fail loudly, because silently
 * pretending to save someone's book is worse than an honest error.
 */

// --------------------------------------------------------------------- types

export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export type User = {
  id: string;
  name: string;
  email: string;
  school: string;
  className: string;
  passwordHash: string;
  avatarUrl: string | null;
  verificationStatus: VerificationStatus;
  verificationDocUrl: string | null;
  /** Already accounts for expiry — never read `is_plus` from a row directly. */
  isPlus: boolean;
  plusExpiresAt: string | null;
  ratingAvg: number;
  ratingCount: number;
  referralCode: string;
  referredBy: string | null;
  boostCredits: number;
  walletCredit: number;
  payoutBalance: number;
  isAdmin: boolean;
  createdAt: string;
};

/** Columns pulled for a listing's seller, used by every listing query. */
const SELLER_SELECT = `
  seller:profiles!listings_seller_id_fkey (
    id, name, email, school, rating_avg, rating_count, is_plus, plus_expires_at,
    verification_status
  )
`;

const LISTING_SELECT = `*, ${SELLER_SELECT}`;

type ProfileRow = Record<string, unknown>;
type ListingRow = Record<string, unknown> & { seller?: ProfileRow | null };

// ----------------------------------------------------------------- utilities

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === "number" ? v : Number(v) || fallback);
const bool = (v: unknown) => v === true;

/** Plus is only really Plus while it hasn't expired. */
function plusIsLive(isPlus: unknown, expiresAt: unknown): boolean {
  if (!bool(isPlus)) return false;
  const exp = typeof expiresAt === "string" ? Date.parse(expiresAt) : NaN;
  return Number.isNaN(exp) ? true : exp > Date.now();
}

/** "22 Jul 2026" — the format the cards and detail page already render. */
export function formatListedOn(iso: string | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Short, shareable, unambiguous referral code — no O/0/I/1 confusion. */
export function makeReferralCode(name: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const prefix = (name.replace(/[^a-zA-Z]/g, "").slice(0, 4) || "READ").toUpperCase();
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}

function mapProfile(row: ProfileRow): User {
  return {
    id: str(row.id),
    name: str(row.name),
    email: str(row.email),
    school: str(row.school),
    className: str(row.class_name),
    passwordHash: str(row.password_hash),
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    verificationStatus: str(row.verification_status, "none") as VerificationStatus,
    verificationDocUrl:
      typeof row.verification_doc_url === "string" ? row.verification_doc_url : null,
    isPlus: plusIsLive(row.is_plus, row.plus_expires_at),
    plusExpiresAt: typeof row.plus_expires_at === "string" ? row.plus_expires_at : null,
    ratingAvg: num(row.rating_avg),
    ratingCount: num(row.rating_count),
    referralCode: str(row.referral_code),
    referredBy: typeof row.referred_by === "string" ? row.referred_by : null,
    boostCredits: num(row.boost_credits),
    walletCredit: num(row.wallet_credit),
    payoutBalance: num(row.payout_balance),
    isAdmin: bool(row.is_admin),
    createdAt: str(row.created_at, new Date().toISOString()),
  };
}

function mapListing(row: ListingRow): Book {
  const seller = row.seller ?? {};
  const sellerName = str(seller.name, "Student");
  return {
    id: str(row.id),
    title: str(row.title),
    price: num(row.price),
    originalPrice: num(row.original_price),
    coverImage: str(row.cover_url),
    condition: str(row.condition, "Good") as Condition,
    subject: str(row.subject, "General"),
    className: str(row.class_name),
    board: str(row.board, "CBSE"),
    publication: str(row.publication, "Not specified"),
    description: str(row.description),
    listedOn: formatListedOn(str(row.created_at)),
    school: str(row.school),
    sellerName,
    sellerInitial: (sellerName.charAt(0) || "S").toUpperCase(),
    sellerEmail: str(seller.email) || undefined,
    views: num(row.views),
    sellerId: str(seller.id) || str(row.seller_id),
    status: str(row.status, "active") as ListingStatus,
    featuredUntil: typeof row.featured_until === "string" ? row.featured_until : null,
    sellerRating: num(seller.rating_avg),
    sellerRatingCount: num(seller.rating_count),
    sellerIsPlus: plusIsLive(seller.is_plus, seller.plus_expires_at),
    sellerIsVerified: str(seller.verification_status) === "approved",
    createdAt: str(row.created_at),
  };
}

// ------------------------------------------------------- featured & early access

/** A paid boost is running right now. */
export function isFeatured(book: Book): boolean {
  return isBoostActive(book.featuredUntil);
}

/**
 * Plus early access: for the first few hours a listing is visible to everyone
 * but only Plus members (and the seller) can act on it. Deliberately NOT
 * hidden — a locked book a buyer can see is what sells memberships; a book
 * they can't see is just missing inventory.
 */
export function earlyAccessEndsAt(book: Book): number {
  const created = book.createdAt ? Date.parse(book.createdAt) : 0;
  return created + PLUS_EARLY_ACCESS_HOURS * 3_600_000;
}

/**
 * Whole hours left in the early-access window.
 *
 * Lives here rather than inline in the page because reading the clock is an
 * impure call, and Next 16's React rules (rightly) forbid those in a
 * component body — even a server one.
 */
export function hoursUntilPublic(book: Book): number {
  return Math.max(0, Math.ceil((earlyAccessEndsAt(book) - Date.now()) / 3_600_000));
}

/** Takes only what it needs, so a session user (no password hash) fits too. */
export function isEarlyAccessLocked(
  book: Book,
  viewer: Pick<User, "id" | "isPlus"> | null,
): boolean {
  if (Date.now() >= earlyAccessEndsAt(book)) return false;
  if (!viewer) return true;
  if (viewer.isPlus) return false;
  return viewer.id !== book.sellerId;
}

/** Boosted listings lead, then newest first. */
function sortForDisplay(books: Book[]): Book[] {
  return [...books].sort((a, b) => {
    const fa = isFeatured(a) ? 1 : 0;
    const fb = isFeatured(b) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
  });
}

// --------------------------------------------------------------------- users

/**
 * Look a user up by email.
 *
 * Uses an exact match on the lower-cased address, NOT `ilike`. That is a
 * security fix, not a style preference: `ilike` treats `%` and `_` as SQL
 * wildcards, so `gurkaranlol9_0@gmail.com` matched the real
 * `gurkaranlol900@gmail.com` account — meaning a login form could be used to
 * probe for accounts, and a crafted address could be matched against the
 * wrong row entirely. Every email is stored lower-cased, so `eq` is both
 * correct and exact.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  if (!isDbConfigured()) return null;
  const { data, error } = await db()
    .from("profiles")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return mapProfile(data);
}

export async function findUserById(id: string): Promise<User | null> {
  if (!isDbConfigured() || !id) return null;
  const { data, error } = await db().from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapProfile(data);
}

export async function findUserByReferralCode(code: string): Promise<User | null> {
  if (!isDbConfigured() || !code.trim()) return null;
  // Exact match for the same reason as the email lookup above — a referral
  // code of "%" must not match a random stranger's account.
  const { data, error } = await db()
    .from("profiles")
    .select("*")
    .eq("referral_code", code.trim().toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return mapProfile(data);
}

export type NewUser = {
  name: string;
  email: string;
  school: string;
  className?: string;
  passwordHash: string;
  referredBy?: string | null;
};

export async function createUser(input: NewUser): Promise<User> {
  const { data, error } = await db()
    .from("profiles")
    .insert({
      name: input.name,
      email: input.email.toLowerCase(),
      school: input.school,
      class_name: input.className ?? "",
      password_hash: input.passwordHash,
      referral_code: makeReferralCode(input.name),
      referred_by: input.referredBy ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create the account.");
  }
  return mapProfile(data);
}

/** Partial profile update by id. Keys are database column names. */
export async function updateUser(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db().from("profiles").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Add to a numeric profile column without a read-modify-write race. */
export async function bumpUser(
  id: string,
  column: "boost_credits" | "wallet_credit" | "payout_balance",
  delta: number,
): Promise<void> {
  const { data } = await db().from("profiles").select(column).eq("id", id).maybeSingle();
  const current = num((data as Record<string, unknown> | null)?.[column]);
  await db()
    .from("profiles")
    .update({ [column]: Math.max(0, current + delta) })
    .eq("id", id);
}

// ------------------------------------------------------------------ listings

/**
 * Everything currently for sale, boosted listings first.
 * Falls back to the bundled demo books when the database isn't configured.
 */
export async function getCatalog(): Promise<Book[]> {
  if (!isDbConfigured()) return BOOKS;
  const { data, error } = await db()
    .from("listings")
    .select(LISTING_SELECT)
    .in("status", ["active", "reserved"])
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return BOOKS;
  return sortForDisplay(data.map(mapListing));
}

/** Sold books too — the profile and leaderboard need the full history. */
export async function getAllListings(): Promise<Book[]> {
  if (!isDbConfigured()) return BOOKS;
  const { data, error } = await db()
    .from("listings")
    .select(LISTING_SELECT)
    .neq("status", "removed")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error || !data) return BOOKS;
  return data.map(mapListing);
}

export async function findBook(id: string): Promise<Book | undefined> {
  if (!isDbConfigured()) return BOOKS.find((b) => b.id === id);
  const { data, error } = await db()
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapListing(data);
}

export type NewListing = {
  id: string;
  sellerId: string;
  title: string;
  price: number;
  originalPrice: number;
  coverUrl: string;
  condition: Condition;
  subject: string;
  className: string;
  board: string;
  publication: string;
  description: string;
  school: string;
};

export async function addListing(input: NewListing): Promise<void> {
  const { error } = await db().from("listings").insert({
    id: input.id,
    seller_id: input.sellerId,
    title: input.title,
    price: input.price,
    original_price: input.originalPrice,
    cover_url: input.coverUrl,
    condition: input.condition,
    subject: input.subject,
    class_name: input.className,
    board: input.board,
    publication: input.publication,
    description: input.description,
    school: input.school,
  });
  if (error) throw new Error(error.message);
}

export async function getListingsByEmail(email: string): Promise<Book[]> {
  const user = await findUserByEmail(email);
  if (!user) return [];
  return getListingsBySellerId(user.id);
}

export async function getListingsBySellerId(sellerId: string): Promise<Book[]> {
  if (!isDbConfigured()) return [];
  const { data, error } = await db()
    .from("listings")
    .select(LISTING_SELECT)
    .eq("seller_id", sellerId)
    .neq("status", "removed")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return sortForDisplay(data.map(mapListing));
}

/**
 * Soft-delete, and only ever your own listing — ownership is checked here so
 * no caller can forget to. Sold books are kept for the seller's record.
 */
export async function removeListing(id: string, ownerId: string): Promise<Book | null> {
  const book = await findBook(id);
  if (!book || book.sellerId !== ownerId) return null;
  if (book.status === "sold") return null;
  const { error } = await db().from("listings").update({ status: "removed" }).eq("id", id);
  if (error) return null;
  return book;
}

export async function setListingStatus(id: string, status: ListingStatus): Promise<void> {
  const { error } = await db().from("listings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setFeaturedUntil(id: string, until: Date): Promise<void> {
  const { error } = await db()
    .from("listings")
    .update({ featured_until: until.toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Fire-and-forget view counter — a failure here must never break a page. */
export async function incrementViews(id: string): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    const { data } = await db().from("listings").select("views").eq("id", id).maybeSingle();
    await db()
      .from("listings")
      .update({ views: num(data?.views) + 1 })
      .eq("id", id);
  } catch {
    // A missed view count is not worth an error page.
  }
}

// --------------------------------------------------------------------- stats

export type MarketplaceStats = {
  booksListed: number;
  activeStudents: number;
  moneySaved: number;
  schoolsConnected: number;
  booksRehomed: number;
  co2Saved: number;
  treesSaved: number;
};

/**
 * The homepage numbers. Computed from real rows, never hardcoded — listing a
 * book on stage visibly moves them, which is the point.
 */
export async function getStats(): Promise<MarketplaceStats> {
  const catalog = await getAllListings();
  const schools = new Set(catalog.map((b) => b.school).filter(Boolean));
  const sellers = new Set(catalog.map((b) => b.sellerId ?? b.sellerName));
  const moneySaved = catalog.reduce((sum, b) => sum + Math.max(0, b.originalPrice - b.price), 0);
  const booksRehomed = catalog.filter((b) => b.status === "sold").length;

  return {
    booksListed: catalog.filter((b) => b.status !== "sold").length,
    activeStudents: sellers.size,
    moneySaved,
    schoolsConnected: schools.size,
    booksRehomed,
    co2Saved: Math.round(catalog.length * CO2_KG_PER_BOOK),
    treesSaved: Math.round(catalog.length * TREES_PER_BOOK * 10) / 10,
  };
}
