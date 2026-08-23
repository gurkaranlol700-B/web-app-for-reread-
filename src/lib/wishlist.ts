import "server-only";

import type { Book, Condition, ListingStatus } from "@/data/books";
import { nullableStr, num, rel, str, type Row } from "@/lib/db-row";
import { formatListedOn } from "@/lib/store";
import { db, isDbConfigured } from "@/lib/supabase";

/**
 * Saved books.
 *
 * The heart on every card used to be decoration — a button with
 * `onClick={(e) => e.preventDefault()}`. It does something now, and what it
 * does matters commercially: a wishlist is the cheapest signal a marketplace
 * gets about demand it hasn't met yet.
 */

const WISH_SELECT = `
  listing:listings!wishlists_listing_id_fkey (
    *,
    seller:profiles!listings_seller_id_fkey ( id, name, email, rating_avg, rating_count, is_plus, plus_expires_at, verification_status )
  )
`;

export async function getWishlistIds(userId: string): Promise<Set<string>> {
  if (!isDbConfigured() || !userId) return new Set();
  const { data, error } = await db().from("wishlists").select("listing_id").eq("user_id", userId);
  if (error || !data) return new Set();
  return new Set(data.map((row) => String(row.listing_id)));
}

export async function isWishlisted(userId: string, listingId: string): Promise<boolean> {
  if (!isDbConfigured() || !userId) return false;
  const { count } = await db()
    .from("wishlists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  return (count ?? 0) > 0;
}

/** Returns the new state, so the caller can tell the user what just happened. */
export async function toggleWishlist(userId: string, listingId: string): Promise<boolean> {
  const already = await isWishlisted(userId, listingId);
  if (already) {
    await db().from("wishlists").delete().eq("user_id", userId).eq("listing_id", listingId);
    return false;
  }
  await db().from("wishlists").insert({ user_id: userId, listing_id: listingId });
  return true;
}

/** The /wishlist page. Sold and removed books drop out on their own. */
export async function getWishlistBooks(userId: string): Promise<Book[]> {
  if (!isDbConfigured() || !userId) return [];
  const { data, error } = await db()
    .from("wishlists")
    .select(WISH_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const books: Book[] = [];
  for (const row of data as Row[]) {
    const listing = rel(row, "listing");
    // A book the seller has taken down shouldn't linger on someone's shortlist.
    if (!listing.id || listing.status === "removed") continue;

    const seller = rel(listing, "seller");
    const sellerName = str(seller.name, "Student");

    books.push({
      id: str(listing.id),
      title: str(listing.title),
      price: num(listing.price),
      originalPrice: num(listing.original_price),
      coverImage: str(listing.cover_url),
      condition: str(listing.condition, "Good") as Condition,
      subject: str(listing.subject),
      className: str(listing.class_name),
      board: str(listing.board),
      publication: str(listing.publication),
      description: str(listing.description),
      listedOn: formatListedOn(str(listing.created_at)),
      school: str(listing.school),
      sellerName,
      sellerInitial: (sellerName.charAt(0) || "S").toUpperCase(),
      sellerEmail: str(seller.email) || undefined,
      views: num(listing.views),
      sellerId: str(seller.id) || undefined,
      status: str(listing.status, "active") as ListingStatus,
      featuredUntil: nullableStr(listing.featured_until),
      sellerRating: num(seller.rating_avg),
      sellerRatingCount: num(seller.rating_count),
      sellerIsVerified: str(seller.verification_status) === "approved",
      createdAt: str(listing.created_at),
    });
  }
  return books;
}

/**
 * How many people have saved this book. Shown on the detail page as social
 * proof, and it is honest scarcity rather than invented urgency: the number
 * is exactly how many students really want this copy.
 */
export async function countWishlisters(listingId: string): Promise<number> {
  if (!isDbConfigured()) return 0;
  const { count } = await db()
    .from("wishlists")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  return count ?? 0;
}
