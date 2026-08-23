/**
 * A one-glance health check of the live database.
 *
 *   npm run status
 *
 * Written for pitch morning: before you present, run this and confirm the
 * numbers look like a marketplace rather than an empty room. It never writes
 * anything, so it is always safe to run.
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

// Node 20 has no global WebSocket and supabase-js insists on a transport when
// it builds its realtime client, even for a script that never uses realtime.
const transport = (typeof WebSocket === "undefined" ? ws : undefined) as never;
const db = createClient(URL_, KEY, {
  auth: { persistSession: false },
  realtime: { transport },
});

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/**
 * Count rows, optionally narrowed by one equality filter.
 *
 * Deliberately not "pass me a callback that transforms the query builder" —
 * supabase-js's builder types are generic enough that threading them through
 * a callback makes the compiler give up. One column and one value covers
 * everything this script needs.
 */
async function count(table: string, column?: string, value?: unknown): Promise<number> {
  const base = db.from(table).select("id", { count: "exact", head: true });
  const { count: c, error } = await (column === undefined ? base : base.eq(column, value));
  if (error) throw new Error(`${table}: ${error.message}`);
  return c ?? 0;
}

async function main() {
  console.log("\nReRead — live database\n");
  console.log(`  ${URL_}\n`);

  const [profiles, plus, listings, sold, orders, completed, messages, reviews, ads, requests] =
    await Promise.all([
      count("profiles"),
      count("profiles", "is_plus", true),
      count("listings", "status", "active"),
      count("listings", "status", "sold"),
      count("orders"),
      count("orders", "status", "completed"),
      count("messages"),
      count("reviews"),
      count("ads"),
      count("book_requests", "status", "open"),
    ]);

  const { data: payments } = await db.from("payments").select("kind, amount, mode");
  const revenue = (payments ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const byKind = new Map<string, number>();
  for (const p of payments ?? []) {
    byKind.set(String(p.kind), (byKind.get(String(p.kind)) ?? 0) + (Number(p.amount) || 0));
  }

  const { data: orderRows } = await db.from("orders").select("amount, status");
  const gmv = (orderRows ?? [])
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const rows: Array<[string, string]> = [
    ["Students", `${profiles}  (${plus} on Plus)`],
    ["Books on sale", String(listings)],
    ["Books sold", String(sold)],
    ["Orders", `${orders}  (${completed} completed)`],
    ["Messages sent", String(messages)],
    ["Reviews", String(reviews)],
    ["Ad campaigns", String(ads)],
    ["Open requests", String(requests)],
    ["", ""],
    ["Marketplace volume", rupees(gmv)],
    ["ReRead revenue", rupees(revenue)],
  ];

  for (const [label, value] of rows) {
    if (!label) {
      console.log("");
      continue;
    }
    console.log(`  ${label.padEnd(22)} ${value}`);
  }

  if (byKind.size) {
    console.log("\n  Revenue by stream");
    for (const [kind, amount] of [...byKind].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${kind.padEnd(20)} ${rupees(amount)}`);
    }
  }

  // The demo accounts, so you never have to hunt for them on stage.
  const { data: demo } = await db
    .from("profiles")
    .select("email, name, is_plus, is_admin")
    .in("email", ["gurkaranlol900@gmail.com", "seller@demo.com", "buyer@demo.com"]);

  console.log("\n  Demo logins (password \"123\")");
  for (const u of demo ?? []) {
    const tags = [u.is_admin ? "admin" : null, u.is_plus ? "plus" : null].filter(Boolean).join(", ");
    console.log(`    ${String(u.email).padEnd(26)} ${u.name}${tags ? `  [${tags}]` : ""}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(`\n  Status check failed: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
