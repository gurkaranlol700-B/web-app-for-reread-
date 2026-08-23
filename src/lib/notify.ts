import "server-only";

import { db, isDbConfigured } from "@/lib/supabase";

/**
 * In-app notifications — the bell in the navbar.
 *
 * Every function here swallows its own errors on purpose. A notification is a
 * courtesy; failing to record one must never roll back the sale, message or
 * review that triggered it.
 */

export type NotificationKind =
  | "message"
  | "order"
  | "review"
  | "alert"
  | "referral"
  | "system";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
};

export async function notify(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  if (!isDbConfigured() || !input.userId) return;
  try {
    await db().from("notifications").insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? "",
      link: input.link ?? "/",
    });
  } catch {
    // Deliberately silent — see the note at the top of the file.
  }
}

export async function getNotifications(userId: string, limit = 30): Promise<Notification[]> {
  if (!isDbConfigured() || !userId) return [];
  const { data, error } = await db()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    kind: String(row.kind) as NotificationKind,
    title: String(row.title),
    body: String(row.body ?? ""),
    link: String(row.link ?? "/"),
    readAt: typeof row.read_at === "string" ? row.read_at : null,
    createdAt: String(row.created_at),
  }));
}

export async function countUnread(userId: string): Promise<number> {
  if (!isDbConfigured() || !userId) return 0;
  const { count, error } = await db()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return error ? 0 : (count ?? 0);
}

export async function markAllRead(userId: string): Promise<void> {
  if (!isDbConfigured() || !userId) return;
  try {
    await db()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
  } catch {
    // Same reasoning: never fail a page render over a read receipt.
  }
}
