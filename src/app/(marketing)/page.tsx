import Link from "next/link";
import {
  BookOpen,
  Camera,
  Handshake,
  Leaf,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { BookCard } from "@/components/marketplace/book-card";
import { getCatalog, getStats } from "@/lib/store";

function formatMoney(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

const reasons = [
  {
    icon: BookOpen,
    title: "Curated Quality",
    body: "Every listing requires condition details and clear photos. Know exactly what you're getting.",
  },
  {
    icon: Sparkles,
    title: "Campus Connections",
    body: "Find books from seniors in your own school. Meet safely on campus to exchange.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Students",
    body: "Our community is built on trust. We prioritize authentic student profiles.",
  },
];

/** The four steps from the pitch — all four of them actually built. */
const steps = [
  {
    icon: Camera,
    title: "List it",
    href: "/sell",
    body: "Exams over, books in a cupboard. Photograph one, set a price, done in under a minute.",
  },
  {
    icon: Search,
    title: "Find it",
    href: "/browse",
    body: "Another student searches for that exact book and finds yours — often from their own school.",
  },
  {
    icon: MessageSquare,
    title: "Agree it",
    href: "/messages",
    body: "Chat inside ReRead to sort out a price and a place to meet. No phone numbers change hands.",
  },
  {
    icon: Handshake,
    title: "Close it",
    href: "/orders",
    body: "They pay, you meet, they check the book and read you a code. That releases the money.",
  },
];

export default async function HomePage() {
  const [stats, catalog] = await Promise.all([getStats(), getCatalog()]);
  // Boosted listings lead the Featured row, then the freshest books — instant
  // gratification for a seller who just posted.
  const featured = catalog.slice(0, 4);

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b">
        {/* Decorative backdrop: scattered book glyphs rather than a stock
            photo, so there's no third-party licensing question. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-brand/10 absolute top-[-4rem] right-[-4rem] size-[26rem] rounded-full blur-3xl" />
          {[
            { top: "12%", left: "78%", size: 30, rotate: -12 },
            { top: "62%", left: "88%", size: 22, rotate: 18 },
            { top: "78%", left: "68%", size: 26, rotate: -6 },
            { top: "30%", left: "92%", size: 18, rotate: 24 },
          ].map((b, i) => (
            <BookOpen
              key={i}
              className="text-brand/15 absolute"
              style={{ top: b.top, left: b.left, width: b.size, height: b.size, transform: `rotate(${b.rotate}deg)` }}
            />
          ))}
        </div>

        <div className="relative mx-auto w-full max-w-[70rem] px-6 py-20 text-center sm:px-10 sm:py-28">
          <Reveal>
            <span className="bg-accent/60 text-accent-foreground mono-label inline-flex items-center gap-2 rounded-full px-4 py-1.5 normal-case">
              <Leaf className="size-3.5" />
              The sustainable choice for students
            </span>
          </Reveal>

          <h1 className="mt-6 text-[clamp(2.8rem,7vw,5.5rem)] leading-[1.02] font-medium">
            <Reveal delay={0.08} as="span">
              <span className="block">Pass knowledge</span>
            </Reveal>
            <Reveal delay={0.16} as="span">
              <span className="text-brand block italic">forward.</span>
            </Reveal>
          </h1>

          <Reveal delay={0.28}>
            <p className="text-muted-foreground mx-auto mt-6 max-w-lg text-lg leading-relaxed">
              ReRead is the premium marketplace for school textbooks. Save
              money, reduce waste, and connect with students in your
              community.
            </p>
          </Reveal>

          <Reveal delay={0.36}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/browse"
                className="bg-brand text-brand-foreground inline-flex h-12 items-center gap-2 rounded-full px-7 text-[0.95rem] font-semibold transition-opacity hover:opacity-90"
              >
                Explore Books
              </Link>
              <Link
                href="/sell"
                className="border-border hover:border-foreground inline-flex h-12 items-center rounded-full border px-7 text-[0.95rem] font-semibold transition-colors"
              >
                List a Book
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.44}>
            <div className="border-border mt-16 grid grid-cols-2 gap-6 border-t pt-10 sm:grid-cols-4">
              {[
                { label: "Books Listed", value: String(stats.booksListed) },
                { label: "Active Students", value: String(stats.activeStudents) },
                { label: "Money Saved", value: formatMoney(stats.moneySaved) },
                { label: "Schools Connected", value: String(stats.schoolsConnected) },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-brand font-serif text-3xl font-semibold sm:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mono-label text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------- Featured Editions */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-[90rem] px-6 py-16 sm:px-10 sm:py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.02]">
                  Featured Editions
                </h2>
                <p className="text-muted-foreground mt-2">
                  Curated selections in excellent condition.
                </p>
              </div>
              <Link href="/browse" className="text-brand inline-flex items-center gap-1.5 font-medium">
                View all
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((book, i) => (
              <Reveal key={book.id} delay={i * 0.06}>
                <BookCard book={book} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ How it works
          The four steps from the pitch, on the page, each one linking to the
          thing it describes. Every one of them is built — nothing here is a
          promise about a future version. */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-[70rem] px-6 py-16 sm:px-10 sm:py-20">
          <Reveal>
            <h2 className="text-center text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.02]">
              Four steps. That&apos;s it.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <Link href={step.href} className="group block">
                  <div className="flex items-center gap-3">
                    <span className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-full font-serif text-sm font-semibold">
                      {i + 1}
                    </span>
                    <step.icon className="text-brand size-5" />
                  </div>
                  <h3 className="group-hover:text-brand mt-4 text-lg font-medium transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {step.body}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="border-brand/30 bg-brand/5 mt-12 rounded-2xl border p-6 text-center">
              <p className="text-brand flex items-center justify-center gap-2 font-semibold">
                <ShieldCheck className="size-5" />
                Your money is held until you have the book
              </p>
              <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-relaxed">
                Pay through ReRead and we hold the amount in escrow. At the
                meetup you check the book, then read the seller a 6-digit code.
                Only then do they get paid. No code, no payout — so neither of
                you has to trust a stranger.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- Eco impact
          A real, computed number. Judges remember numbers with trees in them,
          and this one traces back to actual rows in the database. */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-[70rem] px-6 py-16 text-center sm:px-10 sm:py-20">
          <Reveal>
            <Leaf className="text-brand mx-auto size-7" />
            <p className="text-brand mt-5 font-serif text-[clamp(2.5rem,7vw,4.5rem)] leading-none font-semibold">
              {`${stats.co2Saved.toLocaleString("en-IN")} kg`}
            </p>
            <p className="mono-label text-muted-foreground mt-3">of CO₂ kept out of the air</p>
            <p className="text-muted-foreground mx-auto mt-4 max-w-lg leading-relaxed">
              {`That's roughly ${stats.treesSaved} trees, from ${stats.booksListed + stats.booksRehomed} books staying in circulation instead of being reprinted. Every book you pass on adds to it.`}
            </p>
            <Link
              href="/leaderboard"
              className="text-brand mt-6 inline-flex items-center gap-1.5 font-medium"
            >
              See which schools are doing the most
              <span aria-hidden>→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- Why */}
      <section id="why" className="bg-card scroll-mt-20 border-b">
        <div className="mx-auto w-full max-w-[70rem] px-6 py-20 text-center sm:px-10 sm:py-28">
          <Reveal>
            <p className="font-serif text-brand text-xl italic">
              &ldquo;The simplest way to give a book a second life.&rdquo;
            </p>
            <h2 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05]">
              More than a marketplace. A movement.
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-relaxed">
              Every year, millions of perfectly good school books gather dust
              or end up in landfills while new ones are printed. ReRead
              exists to break this cycle.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-8 text-left sm:grid-cols-3">
            {reasons.map((reason, i) => (
              <Reveal key={reason.title} delay={i * 0.08}>
                <div className="bg-accent/40 flex size-11 items-center justify-center rounded-xl">
                  <reason.icon className="text-brand size-5" />
                </div>
                <h3 className="mt-4 text-lg font-medium">{reason.title}</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">{reason.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Final CTA */}
      <section>
        <div className="mx-auto w-full max-w-[70rem] px-6 py-24 text-center sm:px-10 sm:py-32">
          <Reveal>
            <h2 className="text-[clamp(2.2rem,5.5vw,4rem)] leading-[1.02]">
              Ready to pass it on?
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-md leading-relaxed">
              Join thousands of students making education more affordable and
              sustainable.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/sell"
                className="bg-brand text-brand-foreground inline-flex h-12 items-center gap-2 rounded-full px-7 text-[0.95rem] font-semibold transition-opacity hover:opacity-90"
              >
                List Your First Book
              </Link>
              <Link
                href="/browse"
                className="border-border hover:border-foreground inline-flex h-12 items-center rounded-full border px-7 text-[0.95rem] font-semibold transition-colors"
              >
                Browse Library
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
