/**
 * Puts the marketplace back into a clean, presentable state.
 *
 *   npm run demo:reset
 *
 * Written for the morning of the pitch. Rehearsing a demo leaves debris —
 * half-finished checkouts holding books hostage as "reserved", test chats,
 * a review you left on yourself. This clears that debris WITHOUT touching the
 * seeded catalogue or the accounts you log in with.
 *
 * What it does:
 *   - cancels every unfinished order and puts its book back on the shelf
 *   - optionally (--hard) also removes messages, reviews, orders, payments,
 *     wishlists, requests and ad campaigns, returning the site to day one
 *
 * It never deletes profiles, and never deletes the seeded books.
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

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !KEY) {
  console.error("\n  Supabase isn't configured — check reread/.env.local\n");
  process.exit(1);
}

const transport = (typeof WebSocket === "undefined" ? ws : undefined) as never;
const db = createClient(URL_, KEY, {
  auth: { persistSession: false },
  realtime: { transport },
});

const HARD = process.argv.includes("--hard");

async function main() {
  console.log(`\nResetting demo state${HARD ? "  (--hard: clearing all activity)" : ""}\n`);

  // ---- 1. Free up books held by unfinished checkouts -----------------------
  const { data: stuck } = await db
    .from("orders")
    .select("id, listing_id, status")
    .in("status", ["pending", "paid"]);

  if (stuck?.length) {
    await db
      .from("listings")
      .update({ status: "active" })
      .in(
        "id",
        stuck.map((o) => String(o.listing_id)),
      );
    await db
      .from("orders")
      .update({ status: "cancelled" })
      .in(
        "id",
        stuck.map((o) => String(o.id)),
      );
    console.log(`  released ${stuck.length} book(s) from unfinished checkouts`);
  } else {
    console.log("  no unfinished checkouts");
  }

  if (HARD) {
    // Order matters: rows that reference others go first.
    const tables = [
      "reviews",
      "payments",
      "orders",
      "messages",
      "conversations",
      "wishlists",
      "book_alerts",
      "book_requests",
      "notifications",
      "view_events",
      "ads",
    ];
    for (const table of tables) {
      // A delete with no filter is rejected by PostgREST, so match everything
      // by asking for rows whose created_at is after the epoch.
      const { error } = await db.from(table).delete().gte("created_at", "1970-01-01");
      console.log(`  cleared ${table}${error ? ` — ${error.message}` : ""}`);
    }

    // Anything sold during rehearsal goes back on the shelf.
    const { count } = await db
      .from("listings")
      .update({ status: "active" }, { count: "exact" })
      .neq("status", "active");
    console.log(`  put ${count ?? 0} listing(s) back on sale`);

    // Reset the rolled-up numbers that reviews and payouts fed.
    await db
      .from("profiles")
      .update({ rating_avg: 0, rating_count: 0, payout_balance: 0 })
      .gte("created_at", "1970-01-01");
    console.log("  reset seller ratings and payout balances");
  }

  console.log("\nDone. Run `npm run status` to see the result.\n");
}

main().catch((err) => {
  console.error(`\n  Reset failed: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
