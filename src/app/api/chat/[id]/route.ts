import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getConversationFor, getMessages, markThreadRead } from "@/lib/chat";

/**
 * The chat thread polls this every couple of seconds.
 *
 * Polling rather than a socket as the primary mechanism is a deliberate
 * choice: a websocket that silently fails on a school's captive-portal wifi
 * looks exactly like "the app is broken" to a judge. A realtime broadcast is
 * layered on top for instant delivery, and this endpoint is what guarantees
 * the messages arrive regardless.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Membership check: you can only read a thread you're actually part of.
  const conversation = await getConversationFor(id, user.id);
  if (!conversation) return NextResponse.json({ error: "not found" }, { status: 404 });

  const messages = await getMessages(id);
  await markThreadRead(id, user.id);

  return NextResponse.json(
    { messages, viewerId: user.id },
    { headers: { "Cache-Control": "no-store" } },
  );
}
