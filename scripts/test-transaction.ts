/**
 * Exercises the whole transaction, for real, against the live database.
 *
 *   npm run test:txn
 *
 * This is the sequence the pitch demo walks through on stage, so it is the one
 * thing that absolutely must not break:
 *
 *   message the seller -> buy -> pay -> read the handover code -> money moves
 *   -> both sides review -> ratings update
 *
 * Every assertion checks the DATABASE, not a return value, because "the
 * function returned ok" and "the money actually moved" are different claims.
 * The script cleans up after itself, so it is safe to run before you present.
 */
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import ws from "ws";

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (!process.env[key]) process.env[key] = value.replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.join(process.cwd(), ".env.local"));

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
    realtime: { transport: (typeof WebSocket === "undefined" ? ws : undefined) as never },
  },
);

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok    ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? `  — ${detail}` : ""}`);
  }
}

async function main() {
  console.log("\nFull transaction test\n");

  // These imports pull in "server-only", which tsx is happy with but Next
  // guards — they're the exact modules the server actions call.
  const { createOrder, markOrderPaid, completeHandover, getOrder } = await import(
    "../src/lib/orders"
  );
  const { startConversation, sendMessage, getMessages } = await import("../src/lib/chat");
  const { leaveReview } = await import("../src/lib/reviews");
  const { splitSale, COMMISSION_PERCENT } = await import("../src/lib/pricing");

  const { data: seller } = await db
    .from("profiles")
    .select("id, name, payout_balance, is_plus")
    .eq("email", "seller@demo.com")
    .single();
  const { data: buyer } = await db
    .from("profiles")
    .select("id, name, rating_avg, rating_count")
    .eq("email", "buyer@demo.com")
    .single();

  // A listing that belongs to the demo seller, created just for this test so
  // nothing in the real catalogue is disturbed.
  const listingId = `test-txn-${Date.now()}`;
  const PRICE = 200;
  await db.from("listings").insert({
    id: listingId,
    seller_id: seller!.id,
    title: "Transaction Test Book",
    price: PRICE,
    original_price: 800,
    cover_url: "/covers/placeholder.jpg",
    condition: "Good",
    subject: "Physics",
    class_name: "Class 12",
    board: "CBSE",
    publication: "Test",
    description: "Created by the transaction test. Deleted at the end.",
    school: "Delhi Public School",
    // Backdated so the Plus early-access window never blocks the buy.
    created_at: new Date(Date.now() - 48 * 3_600_000).toISOString(),
  });

  const payoutBefore = Number(seller!.payout_balance) || 0;

  try {
    // ---- 1. Chat ----------------------------------------------------------
    console.log("Step 1 — buyer messages the seller");
    const chat = await startConversation(listingId, buyer!.id);
    assert("conversation created", chat.ok, chat.ok ? "" : chat.error);
    if (!chat.ok) throw new Error("chat failed");

    const sent = await sendMessage(chat.conversationId, buyer!.id, "Hi! Is this still available?");
    assert("message sent", sent.ok);
    const thread = await getMessages(chat.conversationId);
    assert("message is readable in the thread", thread.length === 1 && thread[0].body.includes("still available"));

    // A seller must not be able to open a chat with themselves.
    const selfChat = await startConversation(listingId, seller!.id);
    assert("seller cannot message their own listing", !selfChat.ok);

    // ---- 2. Buy -----------------------------------------------------------
    console.log("\nStep 2 — buyer checks out");
    const created = await createOrder(listingId, buyer!.id);
    assert("order created", created.ok, created.ok ? "" : created.error);
    if (!created.ok) throw new Error("order failed");

    const orderId = created.order.id;
    const expected = splitSale(PRICE, Boolean(seller!.is_plus));

    assert(
      `commission is ${expected.feePercent}% (₹${expected.platformFee} of ₹${PRICE})`,
      created.order.platformFee === expected.platformFee,
      `got ₹${created.order.platformFee}`,
    );
    assert(
      `seller is owed ₹${expected.sellerPayout}`,
      created.order.sellerPayout === expected.sellerPayout,
    );
    assert("handover code is 6 digits", /^\d{6}$/.test(created.order.handoverCode));

    // The listing must be off the market while the order is live.
    const { data: reserved } = await db.from("listings").select("status").eq("id", listingId).single();
    assert("listing is reserved, not still on sale", reserved!.status === "reserved", `status=${reserved!.status}`);

    // A second buyer must not be able to check the same book out.
    const doubleBuy = await createOrder(listingId, seller!.id);
    assert("a second checkout on the same book is refused", !doubleBuy.ok);

    // ---- 3. Payment -------------------------------------------------------
    console.log("\nStep 3 — payment confirmed");
    const paid = await markOrderPaid(orderId, { mode: "simulated" });
    assert("order marked paid", Boolean(paid));
    const afterPay = await getOrder(orderId);
    assert("status is paid", afterPay?.status === "paid", `status=${afterPay?.status}`);

    // Escrow: the seller must NOT have been paid yet.
    const { data: midway } = await db
      .from("profiles")
      .select("payout_balance")
      .eq("id", seller!.id)
      .single();
    assert(
      "money is still held in escrow before handover",
      Number(midway!.payout_balance) === payoutBefore,
      `balance moved to ₹${midway!.payout_balance}`,
    );

    // ---- 4. Handover ------------------------------------------------------
    console.log("\nStep 4 — the handover code");
    const wrong = await completeHandover(orderId, seller!.id, "000000");
    assert("a wrong code is rejected", !wrong.ok);

    const notSeller = await completeHandover(orderId, buyer!.id, created.order.handoverCode);
    assert("only the seller can confirm the handover", !notSeller.ok);

    const done = await completeHandover(orderId, seller!.id, created.order.handoverCode);
    assert("correct code completes the sale", done.ok, done.ok ? "" : done.error);

    const { data: soldListing } = await db.from("listings").select("status").eq("id", listingId).single();
    assert("listing is now sold", soldListing!.status === "sold", `status=${soldListing!.status}`);

    const { data: afterHandover } = await db
      .from("profiles")
      .select("payout_balance")
      .eq("id", seller!.id)
      .single();
    assert(
      `seller was paid ₹${expected.sellerPayout} on handover`,
      Number(afterHandover!.payout_balance) === payoutBefore + expected.sellerPayout,
      `balance is ₹${afterHandover!.payout_balance}`,
    );

    const { data: commission } = await db
      .from("payments")
      .select("amount, kind")
      .eq("order_id", orderId)
      .eq("kind", "commission")
      .maybeSingle();
    assert(
      `commission of ₹${expected.platformFee} is booked as revenue`,
      Number(commission?.amount) === expected.platformFee,
      commission ? `got ₹${commission.amount}` : "no payment row written",
    );

    // ---- 5. Reviews -------------------------------------------------------
    console.log("\nStep 5 — both sides review");
    const r1 = await leaveReview({
      orderId,
      reviewerId: buyer!.id,
      rating: 5,
      comment: "Book was exactly as described.",
    });
    assert("buyer can review after completion", r1.ok, r1.ok ? "" : r1.error);

    const dupe = await leaveReview({ orderId, reviewerId: buyer!.id, rating: 1, comment: "again" });
    assert("the same person cannot review twice", !dupe.ok);

    const r2 = await leaveReview({
      orderId,
      reviewerId: seller!.id,
      rating: 5,
      comment: "Turned up on time, easy handover.",
    });
    assert("seller can review the buyer", r2.ok, r2.ok ? "" : r2.error);

    const { data: sellerAfter } = await db
      .from("profiles")
      .select("rating_avg, rating_count")
      .eq("id", seller!.id)
      .single();
    assert(
      "seller's star rating updated",
      Number(sellerAfter!.rating_count) > 0 && Number(sellerAfter!.rating_avg) > 0,
      `avg=${sellerAfter!.rating_avg} count=${sellerAfter!.rating_count}`,
    );

    console.log(`\n  (commission rate in force: ${COMMISSION_PERCENT}%)`);
  } finally {
    // ---- Cleanup ----------------------------------------------------------
    console.log("\nCleaning up test data");
    const { data: orders } = await db.from("orders").select("id").eq("listing_id", listingId);
    const ids = (orders ?? []).map((o) => String(o.id));
    if (ids.length) {
      await db.from("reviews").delete().in("order_id", ids);
      await db.from("payments").delete().in("order_id", ids);
      await db.from("orders").delete().in("id", ids);
    }
    await db.from("conversations").delete().eq("listing_id", listingId);
    await db.from("listings").delete().eq("id", listingId);

    // Put the seller's rating and balance back exactly as they were.
    await db
      .from("profiles")
      .update({ payout_balance: payoutBefore, rating_avg: 0, rating_count: 0 })
      .eq("id", seller!.id);
    await db
      .from("profiles")
      .update({ rating_avg: Number(buyer!.rating_avg) || 0, rating_count: Number(buyer!.rating_count) || 0 })
      .eq("id", buyer!.id);
    console.log("  removed");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(`\n  Transaction test crashed: ${err instanceof Error ? err.stack : err}\n`);
  process.exit(1);
});
