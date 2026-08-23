import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Eye,
  IndianRupee,
  Leaf,
  Lock,
  MapPin,
  ShoppingBag,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";

import { BookCard } from "@/components/marketplace/book-card";
import { BoostPanel } from "@/components/marketplace/boost-panel";
import { ReferralCard } from "@/components/profile/referral-card";
import { VerificationCard } from "@/components/profile/verification-card";
import { RemoveListingButton } from "@/components/marketplace/remove-listing-button";
import { getCurrentUser } from "@/lib/auth";
import { computeBadges } from "@/lib/badges";
import { countPurchases } from "@/lib/orders";
import { CO2_KG_PER_BOOK, TREES_PER_BOOK, rupees } from "@/lib/pricing";
import { getReviewsFor } from "@/lib/reviews";
import { getListingsBySellerId } from "@/lib/store";

export const metadata = { title: "My Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const [myBooks, purchased, reviews] = await Promise.all([
    getListingsBySellerId(user.id),
    countPurchases(user.id),
    getReviewsFor(user.id, 5),
  ]);

  const sold = myBooks.filter((book) => book.status === "sold");
  const onSale = myBooks.filter((book) => book.status !== "sold");
  const shelfValue = onSale.reduce((sum, b) => sum + b.price, 0);
  const totalViews = myBooks.reduce((sum, b) => sum + b.views, 0);
  const booksInCirculation = sold.length + purchased;

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const badges = computeBadges({
    listed: myBooks.length,
    sold: sold.length,
    purchased,
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
    isPlus: user.isPlus,
    isVerified: user.verificationStatus === "approved",
    referrals: 0,
  });

  const stats = [
    { icon: BookOpen, label: "Books Listed", value: String(myBooks.length) },
    { icon: ShoppingBag, label: "Books Purchased", value: String(purchased) },
    { icon: IndianRupee, label: "Shelf Value", value: rupees(shelfValue) },
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
          <h1 className="flex flex-wrap items-center gap-3 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">
            {user.name}
            {user.verificationStatus === "approved" ? (
              <BadgeCheck className="text-brand size-6" aria-label="Verified student" />
            ) : null}
            {user.isPlus ? (
              <span className="bg-brand/10 text-brand inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold">
                <Sparkles className="size-3" />
                Plus
              </span>
            ) : null}
          </h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {user.school}
            </span>
            <span>{`Member since ${memberSince}`}</span>
            {user.ratingCount > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="fill-brand text-brand size-3.5" />
                {`${user.ratingAvg.toFixed(1)} · ${user.ratingCount} reviews`}
              </span>
            ) : null}
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

      {/* ---------------------------------------------- Money, impact, referral */}
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <div className="border-border bg-card rounded-2xl border p-6">
          <Wallet className="text-brand size-5" />
          <p className="text-brand mt-3 font-serif text-3xl font-semibold">
            {rupees(user.payoutBalance)}
          </p>
          <p className="mono-label text-muted-foreground mt-1">Earned from sales</p>
          <p className="text-muted-foreground/80 mt-2 text-xs leading-relaxed">
            Released to you each time a buyer confirms the handover.
            {user.walletCredit > 0
              ? ` You also have ${rupees(user.walletCredit)} credit off your next purchase.`
              : ""}
          </p>
        </div>

        <div className="border-brand/30 bg-brand/5 rounded-2xl border p-6">
          <Leaf className="text-brand size-5" />
          <p className="text-brand mt-3 font-serif text-3xl font-semibold">
            {`${Math.round(booksInCirculation * CO2_KG_PER_BOOK)} kg`}
          </p>
          <p className="mono-label text-muted-foreground mt-1">CO₂ you saved</p>
          <p className="text-muted-foreground/80 mt-2 text-xs leading-relaxed">
            {`${booksInCirculation} ${booksInCirculation === 1 ? "book" : "books"} kept in circulation — about ${(booksInCirculation * TREES_PER_BOOK).toFixed(2)} of a tree.`}
          </p>
        </div>

        <ReferralCard code={user.referralCode} boostCredits={user.boostCredits} />
      </div>

      {/* ------------------------------------------------------------ Badges */}
      <div className="mt-10">
        <h2 className="mono-label text-muted-foreground">Badges</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              title={badge.description}
              className={`border-border flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                badge.earned ? "bg-card" : "opacity-40"
              }`}
            >
              <span aria-hidden className="text-base">
                {badge.emoji}
              </span>
              <span className={badge.earned ? "font-medium" : "text-muted-foreground"}>
                {badge.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------ Verification */}
      {user.verificationStatus !== "approved" ? (
        <div className="mt-10 max-w-xl">
          <VerificationCard status={user.verificationStatus} />
        </div>
      ) : null}

      {/* --------------------------------------------------- Reviews received */}
      {reviews.length > 0 ? (
        <div className="mt-12">
          <h2 className="mono-label text-muted-foreground">What people say about you</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id} className="border-border bg-card rounded-2xl border p-5">
                <p className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${i < review.rating ? "fill-brand text-brand" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </p>
                {review.comment ? (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                ) : null}
                <p className="text-muted-foreground/70 mt-3 text-xs">{review.reviewerName}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
              <BookCard book={book} showWishlist={false} />
              {book.status === "sold" ? (
                <p className="text-muted-foreground text-center text-xs">Sold — nice one.</p>
              ) : (
                <>
                  <BoostPanel
                    listingId={book.id}
                    buyerName={user.name}
                    buyerEmail={user.email}
                    boostCredits={user.boostCredits}
                    featuredUntil={book.featuredUntil ?? null}
                  />
                  <RemoveListingButton id={book.id} title={book.title} />
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border-border bg-card mt-8 rounded-2xl border px-8 py-16 text-center">
          <p className="font-serif text-xl italic">Your shelf is empty.</p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            List your first book and it will show up here — along with its views,
            its value, and the option to boost it.
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
