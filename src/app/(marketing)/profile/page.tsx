import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Eye, IndianRupee, Lock, MapPin, ShoppingBag } from "lucide-react";

import { BookCard } from "@/components/marketplace/book-card";
import { RemoveListingButton } from "@/components/marketplace/remove-listing-button";
import { getCurrentUser } from "@/lib/auth";
import { getListingsByEmail } from "@/lib/store";

export const metadata = { title: "My Profile" };

/**
 * The seller's private portfolio — gated by session, reachable only from the
 * navbar avatar, and every stat is computed from THEIR listings alone.
 * "Books Purchased" is a real counter-in-waiting: it stays 0 until the buying
 * flow ships in a later milestone.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const myBooks = getListingsByEmail(user.email);
  const shelfValue = myBooks.reduce((sum, b) => sum + b.price, 0);
  const totalViews = myBooks.reduce((sum, b) => sum + b.views, 0);
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const stats = [
    { icon: BookOpen, label: "Books Listed", value: String(myBooks.length) },
    { icon: ShoppingBag, label: "Books Purchased", value: "0" },
    { icon: IndianRupee, label: "Shelf Value", value: `₹${shelfValue.toLocaleString("en-IN")}` },
    { icon: Eye, label: "Total Views", value: String(totalViews) },
  ];

  return (
    <div className="mx-auto w-full max-w-[90rem] px-6 py-16 sm:px-10 sm:py-20">
      {/* ------------------------------------------------------------ Header */}
      <div className="flex flex-wrap items-center gap-6">
        <span className="bg-brand text-brand-foreground flex size-20 items-center justify-center rounded-full font-serif text-4xl font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">{user.name}</h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
          <p className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {user.school}
            </span>
            <span>{`Member since ${memberSince}`}</span>
          </p>
        </div>
        <span className="text-muted-foreground border-border ml-auto flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs">
          <Lock className="size-3.5" />
          Only you can see this page
        </span>
      </div>

      {/* ------------------------------------------------------------- Stats */}
      <div className="border-border mt-10 grid grid-cols-2 gap-6 border-t pt-10 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="bg-accent/40 flex size-10 items-center justify-center rounded-xl">
              <stat.icon className="text-brand size-4.5" />
            </div>
            <p className="text-brand mt-3 font-serif text-3xl font-semibold">{stat.value}</p>
            <p className="mono-label text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* --------------------------------------------------------- Portfolio */}
      <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono-label text-brand">Portfolio</span>
          <h2 className="mt-2 text-[clamp(1.8rem,3.5vw,2.5rem)] leading-[1.05]">My shelf.</h2>
        </div>
        <Link
          href="/sell"
          className="bg-brand text-brand-foreground inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          List another book
        </Link>
      </div>

      {myBooks.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {myBooks.map((book) => (
            <div key={book.id} className="flex flex-col gap-3">
              <BookCard book={book} />
              <RemoveListingButton id={book.id} title={book.title} />
            </div>
          ))}
        </div>
      ) : (
        <div className="border-border bg-card mt-8 rounded-2xl border px-8 py-16 text-center">
          <p className="font-serif text-xl italic">Your shelf is empty.</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            List your first book and it will show up here — along with its
            views and value.
          </p>
          <Link
            href="/sell"
            className="bg-brand text-brand-foreground mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            List your first book
          </Link>
        </div>
      )}
    </div>
  );
}
