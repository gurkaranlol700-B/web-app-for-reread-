"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { sendMessage, startConversation } from "@/lib/chat";
import { rateLimit } from "@/lib/rate-limit";
import { messageSchema, parseForm } from "@/lib/validation";

export type ChatFormState = { error?: string; sentAt?: number };

/**
 * "Message seller" on a book. Sends the visitor through login first if they
 * need it, and comes straight back to the same book afterwards.
 */
export async function startChat(formData: FormData): Promise<void> {
  const listingId = String(formData.get("listingId") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/books/${listingId}`);

  const result = await startConversation(listingId, user.id);
  if (!result.ok) redirect(`/books/${listingId}?error=${encodeURIComponent(result.error)}`);

  redirect(`/messages/${result.conversationId}`);
}

export async function postMessage(
  _prev: ChatFormState,
  formData: FormData,
): Promise<ChatFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to send a message." };

  const parsed = parseForm(messageSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  // Generous enough that nobody typing fast ever sees it, tight enough that
  // a script can't flood a stranger's inbox.
  const gate = rateLimit(`msg:${user.id}`, 30, 60_000);
  if (!gate.allowed) {
    return { error: `Slow down a moment — try again in ${gate.retryAfterSeconds}s.` };
  }

  const result = await sendMessage(parsed.data.conversationId, user.id, parsed.data.body);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/messages");
  // The timestamp is what tells the client "this submission succeeded, clear
  // the textbox" — an empty state object would be indistinguishable from the
  // initial render.
  return { sentAt: Date.now() };
}
