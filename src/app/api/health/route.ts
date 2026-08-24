import { NextResponse } from "next/server";

import { isDbConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * One request that answers "is the deployment actually wired up?".
 *
 * A missing environment variable does not announce itself. The site still
 * serves pages — it just quietly falls back to the bundled demo catalogue, and
 * anyone who tries to log in hits a wall. That failure is invisible from the
 * homepage, which is the worst possible way to discover it ten minutes before
 * presenting.
 *
 * So: hit /api/health and it names exactly what is missing.
 *
 * It deliberately reports only whether each value is PRESENT, never any part
 * of the value itself, so the endpoint is safe to open in front of anyone.
 */
const REQUIRED = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    why: "Database — without it the site shows demo books and nobody can sign up.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    why: "Database access from the server. Same consequence as above.",
  },
  {
    key: "SESSION_SECRET",
    why: "Signs login cookies. Missing in production means logged-in pages error out.",
  },
] as const;

const OPTIONAL = [
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", enables: "realtime chat updates" },
  { key: "NEXT_PUBLIC_RAZORPAY_KEY_ID", enables: "real Razorpay checkout (falls back to simulated)" },
  { key: "RAZORPAY_KEY_SECRET", enables: "verifying Razorpay payments" },
  { key: "GOOGLE_CLIENT_ID", enables: "Continue with Google" },
  { key: "GOOGLE_CLIENT_SECRET", enables: "Continue with Google" },
  { key: "GITHUB_CLIENT_ID", enables: "Continue with GitHub" },
  { key: "GITHUB_CLIENT_SECRET", enables: "Continue with GitHub" },
  { key: "NEXT_PUBLIC_SITE_URL", enables: "correct OAuth callback + QR code URLs" },
  { key: "ADMIN_EMAIL", enables: "access to /admin" },
] as const;

export async function GET() {
  const missingRequired = REQUIRED.filter((v) => !process.env[v.key]);
  const missingOptional = OPTIONAL.filter((v) => !process.env[v.key]);

  // Prove the database is genuinely reachable, not merely configured — a typo
  // in the URL looks identical to a correct one from the outside.
  let database: "ok" | "unreachable" | "not configured" = "not configured";
  if (isDbConfigured()) {
    try {
      const { db } = await import("@/lib/supabase");
      const { error } = await db()
        .from("listings")
        .select("id", { count: "exact", head: true })
        .limit(1);
      database = error ? "unreachable" : "ok";
    } catch {
      database = "unreachable";
    }
  }

  const healthy = missingRequired.length === 0 && database === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "misconfigured",
      database,
      missingRequired: missingRequired.map((v) => ({ key: v.key, why: v.why })),
      degraded: missingOptional.map((v) => ({ key: v.key, disables: v.enables })),
      checkedAt: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
