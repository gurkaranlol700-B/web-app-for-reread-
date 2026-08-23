import Link from "next/link";
import { HandHeart, MapPin, Search } from "lucide-react";

import { offerBook, retireRequest } from "@/app/actions/requests";
import { RequestForm } from "@/components/marketplace/request-form";
import { getCurrentUser } from "@/lib/auth";
import { rupees } from "@/lib/pricing";
import { getOpenRequests } from "@/lib/requests";

export const metadata = {
  title: "Book requests",
  description: "Tell the community which book you need — someone probably has it.",
};
export const dynamic = "force-dynamic";

function relative(iso: string) {
  const hours = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function RequestsPage() {
  const [user, requests] = await Promise.all([getCurrentUser(), getOpenRequests()]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Wanted</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">
        Can&apos;t find it? Ask.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
        Somebody at your school finished that exact book last year and it&apos;s
        sitting in a cupboard. Post what you need and they&apos;ll come to you.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          {user ? (
            <RequestForm />
          ) : (
            <div className="border-border bg-card rounded-2xl border p-6 text-center">
              <Search className="text-brand mx-auto size-6" />
              <p className="mt-3 font-serif text-lg italic">Log in to post a request.</p>
              <Link
                href="/login?next=/requests"
                className="bg-brand text-brand-foreground mt-4 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                Log in
              </Link>
            </div>
          )}
        </div>

        <div>
          <h2 className="mono-label text-muted-foreground">
            {`${requests.length} ${requests.length === 1 ? "student is" : "students are"} looking right now`}
          </h2>

          {requests.length === 0 ? (
            <p className="border-border text-muted-foreground mt-4 rounded-2xl border border-dashed p-8 text-center text-sm">
              Nothing requested yet. Be the first.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {requests.map((request) => {
                const mine = user?.id === request.userId;
                return (
                  <li key={request.id} className="border-border bg-card rounded-2xl border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{request.title}</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {[request.subject, request.className].filter(Boolean).join(" · ") ||
                            "Any edition"}
                        </p>
                      </div>
                      {request.maxPrice > 0 ? (
                        <span className="bg-brand/10 text-brand shrink-0 rounded-full px-3 py-1 text-xs font-semibold">
                          {`up to ${rupees(request.maxPrice)}`}
                        </span>
                      ) : null}
                    </div>

                    {request.note ? (
                      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        {request.note}
                      </p>
                    ) : null}

                    <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <MapPin className="size-3" />
                        {`${request.studentName}${request.school ? ` · ${request.school}` : ""} · ${relative(request.createdAt)}`}
                      </p>

                      {mine ? (
                        <form action={retireRequest}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <button
                            type="submit"
                            className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                          >
                            Close request
                          </button>
                        </form>
                      ) : user ? (
                        <form action={offerBook}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <button
                            type="submit"
                            className="bg-brand text-brand-foreground inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-opacity hover:opacity-90"
                          >
                            <HandHeart className="size-3.5" />
                            I have this
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
