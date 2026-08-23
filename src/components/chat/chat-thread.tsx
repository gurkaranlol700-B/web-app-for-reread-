"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";

import { postMessage } from "@/app/actions/chat";
import type { ChatMessage } from "@/lib/chat";

/**
 * The live conversation.
 *
 * Delivery is belt-and-braces on purpose. `POLL_MS` guarantees messages
 * arrive on any network that can load a page at all; the Supabase realtime
 * broadcast on top makes them arrive instantly when the socket is healthy.
 * If the socket never connects — school wifi, captive portal, a blocked
 * websocket port — nothing visibly changes, the chat just refreshes a beat
 * later. A demo that degrades quietly beats one that fails loudly.
 */
const POLL_MS = 2_000;

type Props = {
  conversationId: string;
  viewerId: string;
  initialMessages: ChatMessage[];
  otherName: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function ChatThread({
  conversationId,
  viewerId,
  initialMessages,
  otherName,
  supabaseUrl,
  supabaseAnonKey,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);
  // A transition rather than useActionState: the send has to reset the form
  // and refresh the thread once the server confirms, and doing that from an
  // effect on the returned state would be a cascading render.
  const [pending, startTransition] = useTransition();

  // The sent message appears the instant you hit enter, before the round trip.
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (current, body: string): ChatMessage[] => [
      ...current,
      {
        id: `pending-${Date.now()}`,
        conversationId,
        senderId: viewerId,
        body,
        createdAt: new Date().toISOString(),
        readAt: null,
      },
    ],
  );

  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/${conversationId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { messages?: ChatMessage[] };
      if (Array.isArray(data.messages)) setMessages(data.messages);
    } catch {
      // Offline or a dropped request — the next tick tries again.
    }
  }, [conversationId]);

  // Poll. This is the reliable path.
  useEffect(() => {
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Realtime on top. Loaded dynamically so the Supabase client never lands in
  // the bundle of any page that doesn't open a chat.
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        if (cancelled) return;
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
        });
        const channel = client
          .channel(`chat:${conversationId}`)
          .on("broadcast", { event: "message" }, () => void refresh())
          .subscribe();
        cleanup = () => void client.removeChannel(channel);
      } catch {
        // Polling already has this covered.
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [conversationId, refresh, supabaseUrl, supabaseAnonKey]);

  // Stick to the bottom, but only if the reader is already there — yanking
  // someone away from scrollback to show a new message is infuriating.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [optimistic.length]);

  function send(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;

    // Clear the box straight away — waiting for the round trip makes a chat
    // feel laggy even when it isn't.
    formRef.current?.reset();

    startTransition(async () => {
      addOptimistic(body);
      const result = await postMessage({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      await refresh();
    });
  }

  return (
    <div className="border-border bg-card flex h-[min(70vh,40rem)] flex-col overflow-hidden rounded-2xl border">
      <div ref={boxRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {optimistic.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            {`Say hello to ${otherName}. Ask about the condition, or suggest where to meet.`}
          </p>
        ) : null}

        {optimistic.map((message) => {
          const mine = message.senderId === viewerId;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? "bg-brand text-brand-foreground rounded-br-sm"
                    : "bg-accent/50 text-foreground rounded-bl-sm"
                }`}
              >
                <p className="break-words whitespace-pre-wrap">{message.body}</p>
                <p className={`mt-1 text-[0.65rem] ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                  {timeOf(message.createdAt)}
                  {mine && message.readAt ? " · Seen" : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        ref={formRef}
        action={send}
        className="border-border flex items-end gap-2 border-t p-3"
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <textarea
          name="body"
          rows={1}
          required
          maxLength={2000}
          placeholder="Type a message…"
          aria-label="Message"
          className="border-border bg-background focus-visible:ring-ring max-h-32 min-h-11 flex-1 resize-none rounded-xl border px-4 py-3 text-sm outline-none focus-visible:ring-2"
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line — what every messaging
            // app on their phone already does.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Send message"
          className="bg-brand text-brand-foreground flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Send className="size-4" />
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="border-border border-t px-4 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
