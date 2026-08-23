import Link from "next/link";
import { BadgeCheck, Check, Clock, Percent, Rocket, Sparkles, X } from "lucide-react";

import { PayButton } from "@/components/pay/pay-button";
import { getCurrentUser } from "@/lib/auth";
import {
  COMMISSION_PERCENT,
  PLUS_COMMISSION_PERCENT,
  PLUS_EARLY_ACCESS_HOURS,
  PLUS_MONTHLY_BOOST_CREDITS,
  PLUS_PRICE,
  rupees,
} from "@/lib/pricing";

export const metadata = {
  title: "ReRead Plus",
  description: `Half commission, free boosts, no ads and first look at every new listing — ${rupees(PLUS_PRICE)} a year.`,
};

const benefits = [
  {
    icon: Percent,
    title: `${PLUS_COMMISSION_PERCENT}% commission instead of ${COMMISSION_PERCENT}%`,
    body: `Sell five books a year and Plus has already paid for itself. Every rupee after that is pure gain.`,
  },
  {
    icon: Clock,
    title: `${PLUS_EARLY_ACCESS_HOURS}-hour early access`,
    body: "See and claim every new listing before anyone else. The good books go fast — this is how you get them.",
  },
  {
    icon: Rocket,
    title: `${PLUS_MONTHLY_BOOST_CREDITS} free boosts every month`,
    body: "Push your listings to the top of the shelf without paying a rupee. Worth more than the membership on its own.",
  },
  {
    icon: X,
    title: "Zero advertisements",
    body: "No sponsored cards, no banners. Just books.",
  },
  {
    icon: BadgeCheck,
    title: "Gold Plus badge",
    body: "Buyers see it on every listing and every message. Trust closes deals faster.",
  },
  {
    icon: Sparkles,
    title: "Unlimited wishlist alerts",
    body: "Track as many books as you like and get told the moment one appears.",
  },
];

export default async function PlusPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10 sm:py-24">
      <div className="text-center">
        <span className="bg-brand/10 text-brand mono-label inline-flex items-center gap-2 rounded-full px-4 py-1.5 normal-case">
          <Sparkles className="size-3.5" />
          ReRead Plus
        </span>
        <h1 className="mt-6 text-[clamp(2.4rem,6vw,4rem)] leading-[1.03]">
          Sell for less.{" "}
          <span className="text-brand font-serif italic">Buy first.</span>
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-relaxed">
          {`One membership, ${rupees(PLUS_PRICE)} for the whole year — less than a single question bank. It pays for itself on your fifth sale, and then keeps paying.`}
        </p>
      </div>

      {/* -------------------------------------------------------- Price card */}
      <div className="border-brand/40 bg-card mx-auto mt-12 max-w-md rounded-3xl border-2 p-8 text-center">
        <p className="mono-label text-brand">Annual membership</p>
        <p className="mt-3 font-serif text-6xl font-semibold">{rupees(PLUS_PRICE)}</p>
        <p className="text-muted-foreground mt-1 text-sm">per year · cancel any time</p>

        <div className="mt-6">
          {!user ? (
            <Link
              href="/login?next=/plus"
              className="bg-brand text-brand-foreground inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            >
              Log in to join Plus
            </Link>
          ) : user.isPlus ? (
            <div className="border-brand/40 bg-brand/5 rounded-2xl border p-4">
              <p className="text-brand flex items-center justify-center gap-2 font-semibold">
                <BadgeCheck className="size-5" />
                You&apos;re a Plus member
              </p>
              {user.plusExpiresAt ? (
                <p className="text-muted-foreground mt-1 text-sm">
                  {`Renews ${new Date(user.plusExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                </p>
              ) : null}
              <p className="text-muted-foreground mt-2 text-sm">
                {`${user.boostCredits} free ${user.boostCredits === 1 ? "boost" : "boosts"} available.`}
              </p>
            </div>
          ) : (
            <PayButton
              kind="plus"
              amount={PLUS_PRICE}
              label={`Join Plus · ${rupees(PLUS_PRICE)}/year`}
              description="ReRead Plus — annual membership"
              buyerName={user.name}
              buyerEmail={user.email}
            />
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- Benefits */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2">
        {benefits.map((benefit) => (
          <div key={benefit.title} className="border-border bg-card rounded-2xl border p-6">
            <div className="bg-brand/10 flex size-10 items-center justify-center rounded-xl">
              <benefit.icon className="text-brand size-5" />
            </div>
            <h2 className="mt-4 font-serif text-lg font-medium">{benefit.title}</h2>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{benefit.body}</p>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------- The honest maths
          Showing the break-even openly is more persuasive than hiding it. A
          student who can see the number trusts the offer. */}
      <div className="border-border bg-accent/20 mt-12 rounded-2xl border p-8">
        <h2 className="font-serif text-2xl">Does it actually pay off?</h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          {`On a ₹200 book, standard commission is ${rupees((200 * COMMISSION_PERCENT) / 100)}. As a Plus member it's ${rupees((200 * PLUS_COMMISSION_PERCENT) / 100)} — you keep ${rupees((200 * (COMMISSION_PERCENT - PLUS_COMMISSION_PERCENT)) / 100)} more. Sell a set of school books at the end of the year and you're well past the ${rupees(PLUS_PRICE)}.`}
        </p>
        <ul className="mt-5 space-y-2">
          {[
            `${PLUS_MONTHLY_BOOST_CREDITS} boosts a month would cost ${rupees(58)} on their own`,
            "Early access is the difference between getting the book and getting the leftovers",
            "No ads, ever",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm">
              <Check className="text-brand mt-0.5 size-4 shrink-0" />
              <span className="text-muted-foreground">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
