import "server-only";

import { nullableStr, num, rel, str, type Row } from "@/lib/db-row";
import { notify } from "@/lib/notify";
import { db, isDbConfigured } from "@/lib/supabase";
import { findBook } from "@/lib/store";

/**
 * ReRead's built-in chat — step three of the pitch.
 *
 * Buyer and seller never exchange phone numbers or email addresses. That is
 * deliberate and it is a safety feature, not a limitation: two 16-year-olds
 * from different schools can agree a meetup without either of them handing a
 * stranger a way to contact them forever.
 *
 * Messages are written here, on the server. The open thread polls every couple
 * of seconds and a Supabase realtime broadcast makes it feel instant — see
 * `components/chat/chat-thread.tsx` for why it is built with both.
 */

export type Conversation = {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  // Joined for the inbox list.
  bookTitle?: string;
  bookCover?: string;
  bookPrice?: number;
  bookStatus?: string;
  otherName?: string;
  otherId?: string;
  lastMessage?: string;
  unread?: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

const CONVERSATION_SELECT = `
  *,
  listing:listings!conversations_listing_id_fkey ( id, title, cover_url, price, status ),
  buyer:profiles!conversations_buyer_id_fkey ( id, name ),
  seller:profiles!conversations_seller_id_fkey ( id, name )
`;

function mapConversation(row: Row, viewerId: string): Conversation {
  const listing = rel(row, "listing");
  const viewerIsBuyer = str(row.buyer_id) === viewerId;
  const other = rel(row, viewerIsBuyer ? "seller" : "buyer");

  return {
    id: str(row.id),
    listingId: str(row.listing_id),
    buyerId: str(row.buyer_id),
    sellerId: str(row.seller_id),
    lastMessageAt: str(row.last_message_at),
    bookTitle: str(listing.title) || undefined,
    bookCover: str(listing.cover_url) || undefined,
    bookPrice: listing.price === undefined ? undefined : num(listing.price),
    bookStatus: str(listing.status) || undefined,
    otherName: str(other.name, "Student"),
    otherId: str(other.id) || undefined,
  };
}

function mapMessage(row: Row): ChatMessage {
  return {
    id: str(row.id),
    conversationId: str(row.conversation_id),
    senderId: str(row.sender_id),
    body: str(row.body),
    createdAt: str(row.created_at),
    readAt: nullableStr(row.read_at),
  };
}

// ------------------------------------------------------------- conversations

export type StartChatResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

/**
 * Open (or reopen) the thread between this buyer and this book's seller.
 * The unique index on (listing_id, buyer_id) means tapping "Message seller"
 * five times gets you one conversation, not five.
 */
export async function startConversation(
  listingId: string,
  buyerId: string,
): Promise<StartChatResult> {
  const book = await findBook(listingId);
  if (!book?.sellerId) return { ok: false, error: "That book isn't available any more." };
  if (book.sellerId === buyerId) return { ok: false, error: "This is your own listing." };

  const { data: existing } = await db()
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (existing?.id) return { ok: true, conversationId: String(existing.id) };

  const { data, error } = await db()
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: book.sellerId })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Couldn't start the chat — try again." };
  return { ok: true, conversationId: String(data.id) };
}

export async function getConversation(id: string): Promise<Row | null> {
  if (!isDbConfigured() || !id) return null;
  const { data, error } = await db()
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/** A conversation you are actually a party to, or null. */
export async function getConversationFor(
  id: string,
  viewerId: string,
): Promise<Conversation | null> {
  const row = await getConversation(id);
  if (!row) return null;
  if (String(row.buyer_id) !== viewerId && String(row.seller_id) !== viewerId) return null;
  return mapConversation(row, viewerId);
}

/** The inbox: every thread, most recent first, with a preview and unread count. */
export async function getInbox(viewerId: string): Promise<Conversation[]> {
  if (!isDbConfigured() || !viewerId) return [];

  const { data, error } = await db()
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .or(`buyer_id.eq.${viewerId},seller_id.eq.${viewerId}`)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error || !data?.length) return [];

  const conversations = data.map((row) => mapConversation(row, viewerId));
  const ids = conversations.map((c) => c.id);

  // One query for all previews rather than N round trips for N threads.
  const { data: messages } = await db()
    .from("messages")
    .select("conversation_id, sender_id, body, read_at, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false })
    .limit(600);

  const preview = new Map<string, string>();
  const unread = new Map<string, number>();

  for (const message of messages ?? []) {
    const cid = String(message.conversation_id);
    if (!preview.has(cid)) preview.set(cid, String(message.body ?? ""));
    if (!message.read_at && String(message.sender_id) !== viewerId) {
      unread.set(cid, (unread.get(cid) ?? 0) + 1);
    }
  }

  return conversations.map((c) => ({
    ...c,
    lastMessage: preview.get(c.id) ?? "",
    unread: unread.get(c.id) ?? 0,
  }));
}

export async function countUnreadMessages(viewerId: string): Promise<number> {
  if (!isDbConfigured() || !viewerId) return 0;

  const { data } = await db()
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${viewerId},seller_id.eq.${viewerId}`)
    .limit(200);

  const ids = (data ?? []).map((c) => String(c.id));
  if (!ids.length) return 0;

  const { count } = await db()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .neq("sender_id", viewerId)
    .is("read_at", null);

  return count ?? 0;
}

// ------------------------------------------------------------------ messages

export async function getMessages(conversationId: string, limit = 200): Promise<ChatMessage[]> {
  if (!isDbConfigured() || !conversationId) return [];
  const { data, error } = await db()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data.map(mapMessage);
}

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<SendResult> {
  const row = await getConversation(conversationId);
  if (!row) return { ok: false, error: "That conversation doesn't exist." };

  const buyerId = String(row.buyer_id);
  const sellerId = String(row.seller_id);
  if (senderId !== buyerId && senderId !== sellerId) {
    return { ok: false, error: "This isn't your conversation." };
  }

  const { data, error } = await db()
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: "Message didn't send — try again." };

  const recipientId = senderId === buyerId ? sellerId : buyerId;

  await Promise.all([
    db()
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId),
    notify({
      userId: recipientId,
      kind: "message",
      title: `New message about ${str(rel(row, "listing").title, "your book")}`,
      body: body.slice(0, 90),
      link: `/messages/${conversationId}`,
    }),
  ]);

  return { ok: true, message: mapMessage(data) };
}

/** Mark the other side's messages as seen when a thread is opened. */
export async function markThreadRead(conversationId: string, viewerId: string): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await db()
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", viewerId)
      .is("read_at", null);
  } catch {
    // A missing read receipt is not worth failing the page for.
  }
}
