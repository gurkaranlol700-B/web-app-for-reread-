import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { ChatThread } from "@/components/chat/chat-thread";
import { getCurrentUser } from "@/lib/auth";
import { getConversationFor, getMessages, markThreadRead } from "@/lib/chat";
import { rupees } from "@/lib/pricing";

export const metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/messages/${id}`);

  // Returns null for a conversation you aren't part of, so a guessed URL is a
  // 404 rather than someone else's private chat.
  const conversation = await getConversationFor(id, user.id);
  if (!conversation) notFound();

  const [messages] = await Promise.all([getMessages(id), markThreadRead(id, user.id)]);
  const viewerIsSeller = conversation.sellerId === user.id;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 sm:py-14">
      <Link
        href="/messages"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        All conversations
      </Link>

      {/* -------------------------------------------------- The book in question */}
      <div className="border-border bg-card mt-6 flex items-center gap-4 rounded-2xl border p-4">
        <div className="bg-accent/30 relative size-16 shrink-0 overflow-hidden rounded-xl">
          {conversation.bookCover ? (
            <Image
              src={conversation.bookCover}
              alt=""
              fill
              sizes="64px"
              className="object-contain p-1.5"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">
            {viewerIsSeller ? "Buyer" : "Seller"} · {conversation.otherName}
          </p>
          <Link
            href={`/books/${conversation.listingId}`}
            className="hover:text-brand truncate font-medium transition-colors"
          >
            {conversation.bookTitle ?? "This book"}
          </Link>
          <p className="text-brand font-serif font-semibold">
            {conversation.bookPrice ? rupees(conversation.bookPrice) : ""}
            {conversation.bookStatus === "sold" ? (
              <span className="text-muted-foreground ml-2 text-xs font-normal">Sold</span>
            ) : conversation.bookStatus === "reserved" ? (
              <span className="text-muted-foreground ml-2 text-xs font-normal">Reserved</span>
            ) : null}
          </p>
        </div>
        {!viewerIsSeller && conversation.bookStatus === "active" ? (
          <Link
            href={`/books/${conversation.listingId}`}
            className="bg-brand text-brand-foreground inline-flex h-10 shrink-0 items-center rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Buy
          </Link>
        ) : null}
      </div>

      <div className="mt-5">
        <ChatThread
          conversationId={conversation.id}
          viewerId={user.id}
          initialMessages={messages}
          otherName={conversation.otherName ?? "them"}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
          supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}
        />
      </div>

      <p className="text-muted-foreground mt-4 flex items-start gap-2 text-xs leading-relaxed">
        <ShieldCheck className="text-brand mt-0.5 size-4 shrink-0" />
        Meet somewhere public — your school gate, a library, a busy café. Pay
        through ReRead and your money is held until you have the book in your
        hands. Never send money outside the app.
      </p>
    </div>
  );
}
