import "server-only";

import { notify } from "@/lib/notify";
import { db, isDbConfigured } from "@/lib/supabase";

/**
 * "Tell me when a Class 12 Physics book is listed."
 *
 * A marketplace's hardest problem is a buyer arriving one day too early and
 * never coming back. An alert turns that dead visit into a return visit, so
 * this is a retention feature disguised as a convenience.
 */

export type BookAlert = {
  id: string;
  keyword: string;
  subject: string;
  className: string;
  createdAt: string;
};

export async function getAlerts(userId: string): Promise<BookAlert[]> {
  if (!isDbConfigured() || !userId) return [];
  const { data, error } = await db()
    .from("book_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id),
    keyword: String(row.keyword ?? ""),
    subject: String(row.subject ?? ""),
    className: String(row.class_name ?? ""),
    createdAt: String(row.created_at),
  }));
}

export async function addAlert(
  userId: string,
  alert: { keyword?: string; subject?: string; className?: string },
): Promise<void> {
  await db().from("book_alerts").insert({
    user_id: userId,
    keyword: alert.keyword ?? "",
    subject: alert.subject ?? "",
    class_name: alert.className ?? "",
  });
}

export async function removeAlert(userId: string, alertId: string): Promise<void> {
  await db().from("book_alerts").delete().eq("id", alertId).eq("user_id", userId);
}

/**
 * Called right after a book is listed: notify everyone whose alert matches.
 *
 * An alert row can set any combination of keyword / subject / class, and each
 * field that IS set must match. An empty field means "don't care", which is
 * why the checks below skip blanks rather than comparing against "".
 */
export async function matchAlertsForListing(listing: {
  id: string;
  title: string;
  subject: string;
  className: string;
  sellerId: string;
}): Promise<void> {
  if (!isDbConfigured()) return;

  try {
    const { data } = await db().from("book_alerts").select("*").limit(1000);
    if (!data?.length) return;

    const title = listing.title.toLowerCase();
    const subject = listing.subject.toLowerCase();
    const className = listing.className.toLowerCase();

    // One student can hold several overlapping alerts; only tell them once.
    const alerted = new Set<string>();

    for (const row of data) {
      const userId = String(row.user_id);
      if (userId === listing.sellerId || alerted.has(userId)) continue;

      const keyword = String(row.keyword ?? "").toLowerCase().trim();
      const wantSubject = String(row.subject ?? "").toLowerCase().trim();
      const wantClass = String(row.class_name ?? "").toLowerCase().trim();

      if (keyword && !title.includes(keyword)) continue;
      if (wantSubject && wantSubject !== subject) continue;
      if (wantClass && wantClass !== className) continue;

      alerted.add(userId);
      await notify({
        userId,
        kind: "alert",
        title: "A book you're watching just landed",
        body: listing.title,
        link: `/books/${listing.id}`,
      });
    }
  } catch {
    // An alert that didn't fire is a missed nudge, not a broken listing.
  }
}
