import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getInbox } from "@/lib/chat";
import { rupees } from "@/lib/pricing";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

function relativeTime(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  const threads = await getInbox(user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Inbox</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">Your conversations.</h1>
      <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
        Every deal on ReRead starts with a message. Agree a price, pick a place
        to meet — all without giving out your phone number.
      </p>

      {threads.length === 0 ? (
        <div className="border-border bg-card mt-10 rounded-2xl border px-8 py-16 text-center">
          <MessageSquare className="text-brand mx-auto size-8" />
          <p className="mt-4 font-serif text-xl italic">No conversations yet.</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            Find a book you need and tap “Message seller” — the chat opens here.
          </p>
          <Link
            href="/browse"
            className="bg-brand text-brand-foreground mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Browse books
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-3">
          {threads.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/messages/${thread.id}`}
                className="border-border bg-card hover:border-brand/50 focus-visible:ring-ring flex items-center gap-4 rounded-2xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="bg-accent/30 relative size-14 shrink-0 overflow-hidden rounded-xl">
                  {thread.bookCover ? (
                    <Image
                      src={thread.bookCover}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-1.5"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">{thread.otherName}</p>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {relativeTime(thread.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    {thread.bookTitle ?? "A book"}
                    {thread.bookPrice ? ` · ${rupees(thread.bookPrice)}` : ""}
                  </p>
                  {thread.lastMessage ? (
                    <p className="text-muted-foreground/80 mt-0.5 truncate text-sm">
                      {thread.lastMessage}
                    </p>
                  ) : null}
                </div>

                {thread.unread ? (
                  <span className="bg-brand text-brand-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {thread.unread > 9 ? "9+" : thread.unread}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
