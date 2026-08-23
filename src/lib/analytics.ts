import "server-only";

import { num, rel, str, type Row } from "@/lib/db-row";
import { CO2_KG_PER_BOOK, TREES_PER_BOOK } from "@/lib/pricing";
import { db, isDbConfigured } from "@/lib/supabase";

/**
 * Everything the /admin dashboard charts.
 *
 * This is the "do you have traction?" answer, computed from real rows rather
 * than written on a slide. Every number here traces back to something a
 * student actually did.
 */

export type RevenueByKind = { kind: string; amount: number; count: number };
export type DayPoint = { date: string; revenue: number; gmv: number; orders: number };
export type SchoolPoint = { school: string; books: number; sold: number };

export type AdminSnapshot = {
  gmv: number;
  revenue: number;
  takeRate: number;
  ordersCompleted: number;
  ordersLive: number;
  averageOrder: number;
  students: number;
  plusMembers: number;
  listingsActive: number;
  listingsSold: number;
  messages: number;
  reviews: number;
  co2Saved: number;
  treesSaved: number;
  simulatedShare: number;
  byKind: RevenueByKind[];
  daily: DayPoint[];
  topSchools: SchoolPoint[];
};

const EMPTY: AdminSnapshot = {
  gmv: 0,
  revenue: 0,
  takeRate: 0,
  ordersCompleted: 0,
  ordersLive: 0,
  averageOrder: 0,
  students: 0,
  plusMembers: 0,
  listingsActive: 0,
  listingsSold: 0,
  messages: 0,
  reviews: 0,
  co2Saved: 0,
  treesSaved: 0,
  simulatedShare: 0,
  byKind: [],
  daily: [],
  topSchools: [],
};

/** YYYY-MM-DD in local time, so a day on the chart matches a day on a calendar. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getAdminSnapshot(days = 14): Promise<AdminSnapshot> {
  if (!isDbConfigured()) return EMPTY;

  const [payments, orders, profiles, listings, messageCount, reviewCount] = await Promise.all([
    db().from("payments").select("kind, amount, mode, created_at").limit(5000),
    db().from("orders").select("amount, status, created_at").limit(5000),
    db().from("profiles").select("id, is_plus, plus_expires_at").limit(5000),
    db().from("listings").select("school, status").limit(5000),
    db().from("messages").select("id", { count: "exact", head: true }),
    db().from("reviews").select("id", { count: "exact", head: true }),
  ]);

  const paymentRows = payments.data ?? [];
  const orderRows = orders.data ?? [];
  const profileRows = profiles.data ?? [];
  const listingRows = listings.data ?? [];

  // ---------------------------------------------------------------- revenue
  const revenue = paymentRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const simulated = paymentRows
    .filter((row) => row.mode === "simulated")
    .reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const kindTotals = new Map<string, { amount: number; count: number }>();
  for (const row of paymentRows) {
    const kind = String(row.kind);
    const current = kindTotals.get(kind) ?? { amount: 0, count: 0 };
    current.amount += Number(row.amount) || 0;
    current.count += 1;
    kindTotals.set(kind, current);
  }

  // ----------------------------------------------------------------- orders
  const completed = orderRows.filter((row) => row.status === "completed");
  const live = orderRows.filter((row) => row.status === "pending" || row.status === "paid");
  const gmv = completed.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  // ------------------------------------------------------------ daily series
  const buckets = new Map<string, DayPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000);
    const key = dayKey(date.toISOString());
    buckets.set(key, { date: key, revenue: 0, gmv: 0, orders: 0 });
  }
  for (const row of paymentRows) {
    const bucket = buckets.get(dayKey(String(row.created_at)));
    if (bucket) bucket.revenue += Number(row.amount) || 0;
  }
  for (const row of completed) {
    const bucket = buckets.get(dayKey(String(row.created_at)));
    if (bucket) {
      bucket.gmv += Number(row.amount) || 0;
      bucket.orders += 1;
    }
  }

  // ------------------------------------------------------------ per school
  const schools = new Map<string, SchoolPoint>();
  for (const row of listingRows) {
    const school = String(row.school || "Unlisted");
    const entry = schools.get(school) ?? { school, books: 0, sold: 0 };
    entry.books += 1;
    if (row.status === "sold") entry.sold += 1;
    schools.set(school, entry);
  }

  const plusMembers = profileRows.filter((row) => {
    if (row.is_plus !== true) return false;
    const expiry = typeof row.plus_expires_at === "string" ? Date.parse(row.plus_expires_at) : NaN;
    return Number.isNaN(expiry) || expiry > Date.now();
  }).length;

  const rehomed = listingRows.filter((row) => row.status === "sold").length;

  return {
    gmv,
    revenue,
    // Take rate over completed GMV — the number an investor actually asks for.
    takeRate: gmv > 0 ? (revenue / gmv) * 100 : 0,
    ordersCompleted: completed.length,
    ordersLive: live.length,
    averageOrder: completed.length ? Math.round(gmv / completed.length) : 0,
    students: profileRows.length,
    plusMembers,
    listingsActive: listingRows.filter((row) => row.status === "active").length,
    listingsSold: rehomed,
    messages: messageCount.count ?? 0,
    reviews: reviewCount.count ?? 0,
    co2Saved: Math.round(rehomed * CO2_KG_PER_BOOK),
    treesSaved: Math.round(rehomed * TREES_PER_BOOK * 10) / 10,
    simulatedShare: revenue > 0 ? (simulated / revenue) * 100 : 0,
    byKind: [...kindTotals.entries()]
      .map(([kind, value]) => ({ kind, ...value }))
      .sort((a, b) => b.amount - a.amount),
    daily: [...buckets.values()],
    topSchools: [...schools.values()].sort((a, b) => b.books - a.books).slice(0, 6),
  };
}

// ------------------------------------------------------------- leaderboard

export type LeaderRow = { name: string; school: string; sold: number; rating: number };

/** Public leaderboard — turns rollout into inter-school competition. */
export async function getLeaderboard(): Promise<{
  schools: SchoolPoint[];
  sellers: LeaderRow[];
}> {
  if (!isDbConfigured()) return { schools: [], sellers: [] };

  const [listings, orders] = await Promise.all([
    db().from("listings").select("school, status, seller_id").limit(2000),
    db()
      .from("orders")
      .select("seller_id, status, seller:profiles!orders_seller_id_fkey ( name, school, rating_avg )")
      .eq("status", "completed")
      .limit(2000),
  ]);

  const schools = new Map<string, SchoolPoint>();
  for (const row of listings.data ?? []) {
    const school = String(row.school || "Unlisted");
    const entry = schools.get(school) ?? { school, books: 0, sold: 0 };
    entry.books += 1;
    if (row.status === "sold") entry.sold += 1;
    schools.set(school, entry);
  }

  const sellers = new Map<string, LeaderRow>();
  for (const row of (orders.data ?? []) as Row[]) {
    const seller = rel(row, "seller");
    if (!seller.name) continue;
    const key = str(row.seller_id);
    const entry = sellers.get(key) ?? {
      name: str(seller.name),
      school: str(seller.school),
      sold: 0,
      rating: num(seller.rating_avg),
    };
    entry.sold += 1;
    sellers.set(key, entry);
  }

  return {
    schools: [...schools.values()].sort((a, b) => b.sold - a.sold || b.books - a.books).slice(0, 10),
    sellers: [...sellers.values()].sort((a, b) => b.sold - a.sold).slice(0, 10),
  };
}
