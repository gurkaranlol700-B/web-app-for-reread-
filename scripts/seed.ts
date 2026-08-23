/**
 * Seeds a fresh Supabase project so the marketplace is never an empty room.
 *
 *   npm run seed
 *
 * Safe to run repeatedly: profiles are matched on email and listings on id,
 * so a second run updates rather than duplicates. Nothing here is destructive
 * — real accounts and real listings created through the site are untouched.
 */
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import { BOOKS } from "../src/data/books";
import { hashPassword } from "../src/lib/password";

// --------------------------------------------------------------- env loading
// tsx doesn't read .env.local, and pulling in dotenv for six lines of parsing
// isn't worth another dependency.
function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error(
    "\n  Missing Supabase credentials.\n\n" +
      "  Put these in reread/.env.local, then run `npm run seed` again:\n\n" +
      "    NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\n" +
      "    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...\n" +
      "    SUPABASE_SERVICE_ROLE_KEY=eyJ...\n",
  );
  process.exit(1);
}

// Node 20 has no global WebSocket and supabase-js insists on a transport when
// it builds its realtime client, even for a script that never uses realtime.
const transport = (typeof WebSocket === "undefined" ? ws : undefined) as never;

const db = createClient(URL, KEY, {
  auth: { persistSession: false },
  realtime: { transport },
});
const BUCKET = "covers";
const DEMO_PASSWORD = "123";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function referralCode(name: string) {
  const prefix = (name.replace(/[^a-zA-Z]/g, "").slice(0, 4) || "READ").toUpperCase();
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += REFERRAL_ALPHABET[Math.floor(Math.random() * REFERRAL_ALPHABET.length)];
  }
  return `${prefix}-${suffix}`;
}

function emailFor(name: string) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@demo.reread.in`;
}

// ------------------------------------------------------------------- storage

async function ensureBucket() {
  const { data } = await db.storage.listBuckets();
  if (data?.some((b) => b.name === BUCKET)) {
    console.log(`  bucket "${BUCKET}" already exists`);
    return;
  }
  const { error } = await db.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
  });
  if (error) throw new Error(`Could not create the storage bucket: ${error.message}`);
  console.log(`  created public bucket "${BUCKET}"`);
}

/** Push /public/covers/*.jpg into Storage and return local path -> public URL. */
async function uploadSeedCovers(): Promise<Map<string, string>> {
  const dir = path.join(process.cwd(), "public", "covers");
  const urls = new Map<string, string>();
  if (!fs.existsSync(dir)) {
    console.warn("  no public/covers directory — skipping cover upload");
    return urls;
  }

  for (const file of fs.readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
    const remote = `seed/${file}`;
    const bytes = fs.readFileSync(path.join(dir, file));
    const contentType = file.toLowerCase().endsWith(".png")
      ? "image/png"
      : file.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

    const { error } = await db.storage
      .from(BUCKET)
      .upload(remote, bytes, { contentType, upsert: true, cacheControl: "31536000" });
    if (error) {
      console.warn(`  ! ${file}: ${error.message}`);
      continue;
    }
    urls.set(`/covers/${file}`, db.storage.from(BUCKET).getPublicUrl(remote).data.publicUrl);
  }

  console.log(`  uploaded ${urls.size} cover images`);
  return urls;
}

// ------------------------------------------------------------------ profiles

type SeedProfile = {
  name: string;
  email: string;
  school: string;
  className?: string;
  isAdmin?: boolean;
  isPlus?: boolean;
};

async function ensureProfile(profile: SeedProfile): Promise<string> {
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("email", profile.email.toLowerCase())
    .maybeSingle();

  if (existing?.id) {
    // Keep the flags fresh (admin/Plus) without touching the password.
    await db
      .from("profiles")
      .update({
        name: profile.name,
        school: profile.school,
        class_name: profile.className ?? "",
        is_admin: profile.isAdmin ?? false,
        is_plus: profile.isPlus ?? false,
        plus_expires_at: profile.isPlus
          ? new Date(Date.now() + 365 * 86_400_000).toISOString()
          : null,
      })
      .eq("id", existing.id);
    return String(existing.id);
  }

  const { data, error } = await db
    .from("profiles")
    .insert({
      name: profile.name,
      email: profile.email.toLowerCase(),
      school: profile.school,
      class_name: profile.className ?? "",
      password_hash: hashPassword(DEMO_PASSWORD),
      referral_code: referralCode(profile.name),
      is_admin: profile.isAdmin ?? false,
      is_plus: profile.isPlus ?? false,
      plus_expires_at: profile.isPlus
        ? new Date(Date.now() + 365 * 86_400_000).toISOString()
        : null,
      verification_status: "approved",
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`profile ${profile.email}: ${error?.message}`);
  return String(data.id);
}

// --------------------------------------------------------------------- main

async function main() {
  console.log("\nSeeding ReRead\n");

  console.log("Storage");
  await ensureBucket();
  const coverUrls = await uploadSeedCovers();

  console.log("\nAccounts");

  // The accounts you log in with. Password for all of them is "123".
  const ownerId = await ensureProfile({
    name: "Gurkaran",
    email: "gurkaranlol900@gmail.com",
    school: "Delhi Public School",
    className: "Class 12",
    isAdmin: true,
    isPlus: true,
  });
  console.log("  gurkaranlol900@gmail.com  (you — admin + Plus)");

  await ensureProfile({
    name: "Demo Seller",
    email: "seller@demo.com",
    school: "Delhi Public School",
    className: "Class 12",
  });
  console.log("  seller@demo.com           (stage demo — seller phone)");

  await ensureProfile({
    name: "Demo Buyer",
    email: "buyer@demo.com",
    school: "Ryan International",
    className: "Class 11",
  });
  console.log("  buyer@demo.com            (stage demo — buyer phone)");

  // One profile per distinct seller named in the demo catalogue, so every
  // seeded book has a real account behind it that can be chatted with.
  const sellerIds = new Map<string, string>();
  for (const book of BOOKS) {
    if (sellerIds.has(book.sellerName)) continue;
    const id = await ensureProfile({
      name: book.sellerName,
      email: emailFor(book.sellerName),
      school: book.school,
      className: book.className,
    });
    sellerIds.set(book.sellerName, id);
  }
  console.log(`  ${sellerIds.size} demo student accounts`);

  console.log("\nListings");
  const rows = BOOKS.map((book, index) => ({
    id: book.id,
    seller_id: sellerIds.get(book.sellerName) ?? ownerId,
    title: book.title,
    price: book.price,
    original_price: book.originalPrice,
    cover_url: coverUrls.get(book.coverImage) ?? book.coverImage,
    condition: book.condition,
    subject: book.subject,
    class_name: book.className,
    board: book.board,
    publication: book.publication,
    description: book.description,
    school: book.school,
    status: "active",
    views: book.views,
    // Stagger the timestamps so "newest first" has a real order and none of
    // them sit inside the Plus early-access window.
    created_at: new Date(Date.now() - (index + 2) * 36 * 3_600_000).toISOString(),
  }));

  const { error } = await db.from("listings").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`listings: ${error.message}`);
  console.log(`  ${rows.length} books on the shelf`);

  console.log("\nDone. Every demo account's password is \"123\".\n");
}

main().catch((err) => {
  console.error(`\n  Seed failed: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
