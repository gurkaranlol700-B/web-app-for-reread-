import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Heart, X } from "lucide-react";

import { deleteAlert } from "@/app/actions/wishlist";
import { AlertForm } from "@/components/marketplace/alert-form";
import { BookCard } from "@/components/marketplace/book-card";
import { getAlerts } from "@/lib/alerts";
import { getCurrentUser } from "@/lib/auth";
import { getWishlistBooks } from "@/lib/wishlist";

export const metadata = { title: "Saved books" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/wishlist");

  const [books, alerts] = await Promise.all([getWishlistBooks(user.id), getAlerts(user.id)]);

  return (
    <div className="mx-auto w-full max-w-[90rem] px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Saved</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">Your shortlist.</h1>
      <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
        Books you&apos;ve saved, plus alerts for the ones nobody has listed yet.
      </p>

      {books.length === 0 ? (
        <div className="border-border bg-card mt-10 rounded-2xl border px-8 py-16 text-center">
          <Heart className="text-brand mx-auto size-8" />
          <p className="mt-4 font-serif text-xl italic">Nothing saved yet.</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            Tap the heart on any book and it lands here, so you can compare
            before you commit.
          </p>
          <Link
            href="/browse"
            className="bg-brand text-brand-foreground mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Browse books
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} saved />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- Alerts */}
      <div className="border-border mt-16 grid gap-8 border-t pt-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="font-serif text-2xl">Not listed yet?</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Set an alert and we&apos;ll tell you the second someone lists a
            matching book — usually within days of an exam finishing.
          </p>
          <div className="mt-5">
            <AlertForm />
          </div>
        </div>

        <div>
          <h3 className="mono-label text-muted-foreground">
            {`${alerts.length} active ${alerts.length === 1 ? "alert" : "alerts"}`}
          </h3>

          {alerts.length === 0 ? (
            <p className="border-border text-muted-foreground mt-4 rounded-2xl border border-dashed p-8 text-center text-sm">
              No alerts yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="border-border bg-card flex items-center gap-3 rounded-xl border p-4"
                >
                  <Bell className="text-brand size-4 shrink-0" />
                  <span className="flex-1 text-sm">
                    {[alert.keyword, alert.subject, alert.className]
                      .filter(Boolean)
                      .join(" · ") || "Any book"}
                  </span>
                  <form action={deleteAlert}>
                    <input type="hidden" name="alertId" value={alert.id} />
                    <button
                      type="submit"
                      aria-label="Remove alert"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
