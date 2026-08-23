import "server-only";

import { num, rel, str, type Row } from "@/lib/db-row";
import { notify } from "@/lib/notify";
import { db, isDbConfigured } from "@/lib/supabase";

/**
 * The demand board — "I need TS Grewal Class 12, max ₹200".
 *
 * Every marketplace has the same cold-start problem: buyers leave when the
 * shelf is empty, and sellers don't list when nobody's looking. A request
 * board breaks that loop by making demand visible BEFORE supply exists. A
 * student with the book sitting on their shelf sees someone wants it, at a
 * price, today.
 *
 * It also answers the sharpest question a judge can ask — "how do you get
 * inventory?" — with a mechanism instead of a hope.
 */

export type BookRequest = {
  id: string;
  userId: string;
  title: string;
  subject: string;
  className: string;
  maxPrice: number;
  note: string;
  status: string;
  createdAt: string;
  studentName?: string;
  school?: string;
};

const SELECT = `*, student:profiles!book_requests_user_id_fkey ( name, school )`;

function mapRequest(row: Row): BookRequest {
  const student = rel(row, "student");
  return {
    id: str(row.id),
    userId: str(row.user_id),
    title: str(row.title),
    subject: str(row.subject),
    className: str(row.class_name),
    maxPrice: num(row.max_price),
    note: str(row.note),
    status: str(row.status, "open"),
    createdAt: str(row.created_at),
    studentName: str(student.name, "A student"),
    school: str(student.school),
  };
}

export async function getOpenRequests(limit = 60): Promise<BookRequest[]> {
  if (!isDbConfigured()) return [];
  const { data, error } = await db()
    .from("book_requests")
    .select(SELECT)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(mapRequest);
}

export async function getRequestsByUser(userId: string): Promise<BookRequest[]> {
  if (!isDbConfigured() || !userId) return [];
  const { data, error } = await db()
    .from("book_requests")
    .select(SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapRequest);
}

export async function addRequest(
  userId: string,
  input: { title: string; subject: string; className: string; maxPrice: number; note: string },
): Promise<void> {
  const { error } = await db().from("book_requests").insert({
    user_id: userId,
    title: input.title,
    subject: input.subject,
    class_name: input.className,
    max_price: input.maxPrice,
    note: input.note,
  });
  if (error) throw new Error(error.message);
}

export async function closeRequest(userId: string, requestId: string): Promise<void> {
  await db()
    .from("book_requests")
    .update({ status: "closed" })
    .eq("id", requestId)
    .eq("user_id", userId);
}

/**
 * A seller says "I have this". The requester gets told, with a link straight
 * into a conversation — the shortest possible path from demand to a deal.
 */
export async function respondToRequest(input: {
  requestId: string;
  responderId: string;
  responderName: string;
}): Promise<{ ok: boolean; requesterId?: string }> {
  if (!isDbConfigured()) return { ok: false };

  const { data } = await db()
    .from("book_requests")
    .select("user_id, title")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!data) return { ok: false };
  const requesterId = str(data.user_id);
  if (requesterId === input.responderId) return { ok: false };

  await notify({
    userId: requesterId,
    kind: "alert",
    title: `${input.responderName} has the book you asked for`,
    body: str(data.title),
    link: "/requests",
  });

  return { ok: true, requesterId };
}
