/**
 * End-to-end smoke test against a running server.
 *
 *   npm start                (in one terminal)
 *   npm run smoke            (in another)
 *
 * Signs in as a real seeded account by minting the same signed cookie the
 * login action would, then requests every page a logged-in student can reach
 * and asserts the HTML actually contains what it should.
 *
 * A 200 is not proof a page works — a page can return 200 while rendering an
 * error boundary or an empty shell. So each check names a phrase that only
 * appears when the page genuinely rendered.
 */
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";

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

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.SESSION_SECRET ?? "reread-dev-only-secret";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const transport = (typeof WebSocket === "undefined" ? ws : undefined) as never;
const db = createClient(URL_, KEY, { auth: { persistSession: false }, realtime: { transport } });

/** Same construction as createSession() in src/lib/auth.ts. */
function mintCookie(id: string, email: string) {
  const payload = Buffer.from(
    JSON.stringify({ id, email, exp: Date.now() + 3_600_000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `reread_session=${payload}.${sig}`;
}

type Check = {
  path: string;
  /** Phrases that must ALL appear in the rendered HTML. */
  expect: string[];
  /** Phrases that must NOT appear. */
  reject?: string[];
};

let passed = 0;
let failed = 0;
const failures: string[] = [];

function strip(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
}

async function check(cookie: string, c: Check, label: string) {
  const res = await fetch(`${BASE}${c.path}`, {
    headers: { cookie, "user-agent": "reread-smoke" },
    redirect: "manual",
  });

  const status = res.status;
  const html = status === 200 ? await res.text() : "";
  const text = strip(html);

  const missing = c.expect.filter((phrase) => !text.includes(phrase));
  const leaked = (c.reject ?? []).filter((phrase) => text.includes(phrase));

  const ok = status === 200 && missing.length === 0 && leaked.length === 0;
  if (ok) {
    passed++;
    console.log(`  ok    ${label.padEnd(10)} ${c.path}`);
  } else {
    failed++;
    const why =
      status !== 200
        ? `HTTP ${status}`
        : missing.length
          ? `missing ${JSON.stringify(missing)}`
          : `should not contain ${JSON.stringify(leaked)}`;
    failures.push(`${label} ${c.path} — ${why}`);
    console.log(`  FAIL  ${label.padEnd(10)} ${c.path}  ${why}`);
  }
}

async function main() {
  console.log(`\nSmoke test against ${BASE}\n`);

  const { data: owner } = await db
    .from("profiles")
    .select("id, email")
    .eq("email", "gurkaranlol900@gmail.com")
    .maybeSingle();
  const { data: buyer } = await db
    .from("profiles")
    .select("id, email")
    .eq("email", "buyer@demo.com")
    .maybeSingle();

  if (!owner || !buyer) {
    console.error("  Seeded accounts missing — run `npm run seed` first.\n");
    process.exit(1);
  }

  const { data: listing } = await db
    .from("listings")
    .select("id, title")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const adminCookie = mintCookie(String(owner.id), String(owner.email));
  const buyerCookie = mintCookie(String(buyer.id), String(buyer.email));
  const anon = "";

  console.log("Public pages");
  for (const c of [
    { path: "/", expect: ["Pass knowledge", "Books Listed", "Money Saved"] },
    { path: "/browse", expect: ["Every book, one shelf", "books listed by students"] },
    { path: "/plus", expect: ["ReRead Plus", "99"] },
    { path: "/requests", expect: ["request"] },
    { path: "/leaderboard", expect: ["school"] },
    { path: "/advertise", expect: ["Reach students", "Create your campaign"] },
    { path: "/about", expect: ["ReRead"] },
    { path: "/terms", expect: ["Terms"] },
    { path: "/privacy", expect: ["Privacy"] },
    { path: "/login", expect: ["Log in to ReRead", "Continue with Google"] },
    { path: "/signup", expect: ["Create your account"] },
    { path: "/offline", expect: ["offline"] },
  ] satisfies Check[]) {
    await check(anon, c, "anon");
  }

  if (listing) {
    await check(anon, {
      path: `/books/${listing.id}`,
      expect: [String(listing.title).slice(0, 20), "Log in to buy"],
    }, "anon");
  }

  console.log("\nSigned in as a buyer");
  for (const c of [
    { path: "/profile", expect: ["Member since", "Your invite code", "Earned from sales"], reject: ["passwordHash"] },
    { path: "/messages", expect: ["essages"] },
    { path: "/orders", expect: ["rder"] },
    { path: "/wishlist", expect: ["Your shortlist", "Create alert"] },
    { path: "/sell", expect: ["second life", "condition"] },
  ] satisfies Check[]) {
    await check(buyerCookie, c, "buyer");
  }

  if (listing) {
    await check(buyerCookie, {
      path: `/books/${listing.id}`,
      expect: ["Buy now", "Message seller"],
    }, "buyer");
  }

  console.log("\nSigned in as admin");
  await check(adminCookie, {
    path: "/admin",
    expect: ["Marketplace volume", "ReRead revenue", "Take rate", "Revenue by stream"],
  }, "admin");

  console.log("\nAdmin page must be closed to everyone else");
  const adminAsBuyer = await fetch(`${BASE}/admin`, {
    headers: { cookie: buyerCookie },
    redirect: "manual",
  });
  if (adminAsBuyer.status === 200) {
    const body = strip(await adminAsBuyer.text());
    if (body.includes("Marketplace volume")) {
      failed++;
      failures.push("SECURITY: /admin rendered the dashboard for a non-admin");
      console.log("  FAIL  buyer      /admin  rendered the dashboard for a NON-ADMIN");
    } else {
      passed++;
      console.log("  ok    buyer      /admin  blocked");
    }
  } else {
    passed++;
    console.log(`  ok    buyer      /admin  blocked (HTTP ${adminAsBuyer.status})`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f}`);
    console.log("");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n  Smoke run failed: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
