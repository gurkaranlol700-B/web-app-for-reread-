import "server-only";

import { randomInt } from "node:crypto";

import type { Book } from "@/data/books";
import { nullableStr, num, rel, str, type Row } from "@/lib/db-row";
import { notify } from "@/lib/notify";
import { rupees, splitSale } from "@/lib/pricing";
import { db, isDbConfigured } from "@/lib/supabase";
import { bumpUser, findBook, findUserById, setListingStatus } from "@/lib/store";

/**
 * Purchases, escrow, and the meetup handover.
 *
 * The flow, and why it is shaped this way:
 *
 *   1. Buyer taps Buy       -> order `pending`, listing `reserved`
 *   2. Payment succeeds     -> order `paid`. ReRead is HOLDING the money.
 *   3. They meet in person. The buyer's phone shows a 6-digit code. The buyer
 *      inspects the actual book, and only then reads the code out.
 *   4. Seller enters it     -> order `completed`, listing `sold`, payout
 *                              released to the seller's balance.
 *
 * Step 3 is the entire trust mechanism. The seller cannot get paid without the
 * buyer's consent, and the buyer cannot walk off with the book without paying,
 * because the money is already held. Neither side has to trust a stranger —
 * they only have to trust the escrow. That is what a marketplace sells.
 */

export type OrderStatus = "pending" | "paid" | "completed" | "cancelled";

export type Order = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  platformFee: number;
  sellerPayout: number;
  feePercent: number;
  status: OrderStatus;
  handoverCode: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paymentMode: "razorpay" | "simulated";
  createdAt: string;
  completedAt: string | null;
  /** Joined for the order screens. */
  listing?: Pick<Book, "id" | "title" | "coverImage" | "price"> | null;
  buyerName?: string;
  sellerName?: string;
};

const ORDER_SELECT = `
  *,
  listing:listings!orders_listing_id_fkey ( id, title, cover_url, price ),
  buyer:profiles!orders_buyer_id_fkey ( id, name ),
  seller:profiles!orders_seller_id_fkey ( id, name )
`;

function mapOrder(row: Row): Order {
  const listing = rel(row, "listing");
  const buyer = rel(row, "buyer");
  const seller = rel(row, "seller");

  return {
    id: str(row.id),
    listingId: str(row.listing_id),
    buyerId: str(row.buyer_id),
    sellerId: str(row.seller_id),
    amount: num(row.amount),
    platformFee: num(row.platform_fee),
    sellerPayout: num(row.seller_payout),
    feePercent: num(row.fee_percent),
    status: str(row.status, "pending") as OrderStatus,
    handoverCode: str(row.handover_code),
    razorpayOrderId: nullableStr(row.razorpay_order_id),
    razorpayPaymentId: nullableStr(row.razorpay_payment_id),
    paymentMode: row.payment_mode === "simulated" ? "simulated" : "razorpay",
    createdAt: str(row.created_at),
    completedAt: nullableStr(row.completed_at),
    listing: listing.id
      ? {
          id: str(listing.id),
          title: str(listing.title),
          coverImage: str(listing.cover_url),
          price: num(listing.price),
        }
      : null,
    buyerName: str(buyer.name) || undefined,
    sellerName: str(seller.name) || undefined,
  };
}

/** Six digits, from a cryptographic source — a guessable code is no escrow at all. */
function makeHandoverCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// ------------------------------------------------------------------ creation

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; error: string };

/**
 * Open a purchase. The price is read from the database here and nowhere else —
 * the browser never gets a say in what a book costs.
 */
export async function createOrder(listingId: string, buyerId: string): Promise<CreateOrderResult> {
  const book = await findBook(listingId);
  if (!book) return { ok: false, error: "That book isn't available any more." };
  if (book.status !== "active") {
    return { ok: false, error: "Someone just reserved this book. Try another copy." };
  }
  if (book.sellerId === buyerId) {
    return { ok: false, error: "This is your own listing." };
  }

  const seller = book.sellerId ? await findUserById(book.sellerId) : null;
  if (!seller) return { ok: false, error: "Couldn't reach the seller — try again." };

  const split = splitSale(book.price, seller.isPlus);

  const { data, error } = await db()
    .from("orders")
    .insert({
      listing_id: book.id,
      buyer_id: buyerId,
      seller_id: seller.id,
      amount: split.amount,
      platform_fee: split.platformFee,
      seller_payout: split.sellerPayout,
      fee_percent: split.feePercent,
      status: "pending",
      handover_code: makeHandoverCode(),
    })
    .select(ORDER_SELECT)
    .single();

  if (error || !data) {
    // The partial unique index on (listing_id) for live orders makes a double
    // checkout a database error rather than a race condition. Say so plainly.
    return { ok: false, error: "Someone else is checking out this book right now." };
  }

  await setListingStatus(book.id, "reserved");
  return { ok: true, order: mapOrder(data) };
}

// -------------------------------------------------------------------- lookup

export async function getOrder(id: string): Promise<Order | null> {
  if (!isDbConfigured() || !id) return null;
  const { data, error } = await db().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapOrder(data);
}

/** Every order this person is a party to, newest first. */
export async function getOrdersForUser(userId: string): Promise<Order[]> {
  if (!isDbConfigured() || !userId) return [];
  const { data, error } = await db()
    .from("orders")
    .select(ORDER_SELECT)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map(mapOrder);
}

export async function countPurchases(userId: string): Promise<number> {
  if (!isDbConfigured() || !userId) return 0;
  const { count } = await db()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", userId)
    .eq("status", "completed");
  return count ?? 0;
}

// ------------------------------------------------------------------ payment

/**
 * Mark an order paid. Called only after a verified gateway signature (or an
 * explicitly simulated checkout) — never straight from a client callback.
 */
export async function markOrderPaid(
  orderId: string,
  payment: {
    razorpayOrderId?: string | null;
    razorpayPaymentId?: string | null;
    mode: "razorpay" | "simulated";
  },
): Promise<Order | null> {
  const order = await getOrder(orderId);
  if (!order) return null;
  // Idempotent: a webhook and a browser callback both landing is normal, and
  // must not pay a seller twice.
  if (order.status !== "pending") return order;

  const { error } = await db()
    .from("orders")
    .update({
      status: "paid",
      razorpay_order_id: payment.razorpayOrderId ?? null,
      razorpay_payment_id: payment.razorpayPaymentId ?? null,
      payment_mode: payment.mode,
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (error) return null;

  await Promise.all([
    notify({
      userId: order.sellerId,
      kind: "order",
      title: "Your book is sold — arrange the handover",
      body: `${order.buyerName ?? "A student"} paid ${rupees(order.amount)}. Meet them and enter their 6-digit code to get paid.`,
      link: `/orders/${order.id}`,
    }),
    notify({
      userId: order.buyerId,
      kind: "order",
      title: "Payment held safely",
      body: "Show your handover code to the seller when you collect the book.",
      link: `/orders/${order.id}`,
    }),
  ]);

  return getOrder(orderId);
}

// ----------------------------------------------------------------- handover

export type HandoverResult = { ok: true; order: Order } | { ok: false; error: string };

/**
 * The seller enters the buyer's code. This is the moment money changes hands,
 * commission is booked, and the book is finally marked sold.
 */
export async function completeHandover(
  orderId: string,
  sellerId: string,
  code: string,
): Promise<HandoverResult> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "That order doesn't exist." };
  if (order.sellerId !== sellerId) return { ok: false, error: "This isn't your sale." };
  if (order.status === "completed") return { ok: true, order };
  if (order.status !== "paid") {
    return { ok: false, error: "This order hasn't been paid for yet." };
  }
  if (order.handoverCode !== code.trim()) {
    return { ok: false, error: "That code doesn't match. Ask the buyer to read it again." };
  }

  const completedAt = new Date().toISOString();
  const { error } = await db()
    .from("orders")
    .update({ status: "completed", completed_at: completedAt })
    .eq("id", orderId)
    .eq("status", "paid");

  if (error) return { ok: false, error: "Couldn't complete the handover — try again." };

  await Promise.all([
    setListingStatus(order.listingId, "sold"),
    // Escrow released.
    bumpUser(order.sellerId, "payout_balance", order.sellerPayout),
    // Commission booked. THIS row is what the admin dashboard charts, and it
    // is written here rather than at payment time on purpose: ReRead only
    // earns when a student actually receives their book.
    db().from("payments").insert({
      user_id: order.sellerId,
      kind: "commission",
      amount: order.platformFee,
      order_id: order.id,
      listing_id: order.listingId,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId,
      mode: order.paymentMode,
    }),
    notify({
      userId: order.sellerId,
      kind: "review",
      title: `${rupees(order.sellerPayout)} added to your balance`,
      body: "Handover confirmed. Rate your buyer to finish.",
      link: `/orders/${order.id}`,
    }),
    notify({
      userId: order.buyerId,
      kind: "review",
      title: "Enjoy your book",
      body: "Handover confirmed. Leave the seller a rating — it's how ReRead stays trustworthy.",
      link: `/orders/${order.id}`,
    }),
  ]);

  return { ok: true, order: (await getOrder(orderId))! };
}

/** Either side can call off an unpaid order; the book goes back on the shelf. */
export async function cancelOrder(orderId: string, userId: string): Promise<boolean> {
  const order = await getOrder(orderId);
  if (!order) return false;
  if (order.buyerId !== userId && order.sellerId !== userId) return false;
  if (order.status === "completed") return false;

  const { error } = await db()
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .neq("status", "completed");
  if (error) return false;

  await setListingStatus(order.listingId, "active");
  return true;
}
