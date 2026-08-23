"use client";

import Link from "next/link";
import { Fragment, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { SponsoredCard } from "@/components/ads/sponsored-card";
import { BookCard } from "@/components/marketplace/book-card";
import type { Book } from "@/data/books";
import { isBoostActive } from "@/lib/featured";
import type { Ad } from "@/lib/monetize";

const selectCls =
  "border-border bg-card focus-visible:ring-ring h-11 rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-2";

/** How many books between sponsored cards. Sparse enough not to be resented. */
const AD_EVERY = 6;

type SortKey = "featured" | "price-asc" | "price-desc" | "newest" | "rating";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "featured", label: "Recommended" },
  { key: "newest", label: "Newest first" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "rating", label: "Best rated sellers" },
];

/**
 * Client-side search, filters and sort over the full catalogue. Everything
 * happens in memory as you type — no server round trips, instant results.
 *
 * Sponsored cards are woven in every few books rather than stacked at the top,
 * which is both less annoying and, in practice, clicked more.
 */
export function BrowseGrid({
  books,
  savedIds = [],
  ads = [],
}: {
  books: Book[];
  savedIds?: string[];
  ads?: Ad[];
}) {
  const [query, setQuery] = useState("");
  const [klass, setKlass] = useState("All classes");
  const [subject, setSubject] = useState("All subjects");
  const [sort, setSort] = useState<SortKey>("featured");
  const [hideSold, setHideSold] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Keeps typing smooth on a long shelf: the input updates immediately, the
  // (heavier) filtered grid catches up a frame later.
  const deferredQuery = useDeferredValue(query);

  const saved = useMemo(() => new Set(savedIds), [savedIds]);

  const classes = useMemo(
    () => ["All classes", ...[...new Set(books.map((b) => b.className))].filter(Boolean).sort()],
    [books],
  );
  const subjects = useMemo(
    () => ["All subjects", ...[...new Set(books.map((b) => b.subject))].filter(Boolean).sort()],
    [books],
  );

  // ⌘K / Ctrl-K jumps to search — the shortcut anyone who uses software expects.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();

    const matched = books.filter(
      (b) =>
        (klass === "All classes" || b.className === klass) &&
        (subject === "All subjects" || b.subject === subject) &&
        (!hideSold || b.status !== "sold") &&
        (!q ||
          `${b.title} ${b.publication} ${b.board} ${b.subject} ${b.sellerName} ${b.school}`
            .toLowerCase()
            .includes(q)),
    );

    return [...matched].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "newest":
          return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
        case "rating":
          return (b.sellerRating ?? 0) - (a.sellerRating ?? 0);
        default:
          // Boosted listings lead — that is exactly what the boost was paid for.
          const aBoosted = isBoostActive(a.featuredUntil);
          const bBoosted = isBoostActive(b.featuredUntil);
          if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;
          return Date.parse(b.createdAt ?? "") - Date.parse(a.createdAt ?? "");
      }
    });
  }, [books, deferredQuery, klass, subject, sort, hideSold]);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, publisher, board, seller…"
            aria-label="Search books"
            className="border-border bg-card focus-visible:ring-ring placeholder:text-muted-foreground/50 h-11 w-full rounded-full border pr-4 pl-11 text-sm transition-colors outline-none focus-visible:ring-2"
          />
        </label>
        <select
          aria-label="Filter by class"
          value={klass}
          onChange={(e) => setKlass(e.target.value)}
          className={selectCls}
        >
          {classes.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filter by subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={selectCls}
        >
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Sort books"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={selectCls}
        >
          {SORTS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {`${filtered.length} of ${books.length} books`}
        </p>
        <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideSold}
            onChange={(e) => setHideSold(e.target.checked)}
            className="accent-brand size-4"
          />
          <SlidersHorizontal className="size-3.5" />
          Hide sold books
        </label>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((book, index) => {
            // Slot a sponsored card in after every AD_EVERY books, cycling
            // through whatever campaigns are live.
            const adIndex = Math.floor(index / AD_EVERY) - 1;
            const showAd =
              ads.length > 0 && index > 0 && index % AD_EVERY === 0 && adIndex >= 0;
            const ad = showAd ? ads[adIndex % ads.length] : null;

            return (
              <Fragment key={book.id}>
                {ad ? <SponsoredCard ad={ad} /> : null}
                <BookCard book={book} saved={saved.has(book.id)} />
              </Fragment>
            );
          })}
        </div>
      ) : (
        <div className="border-border bg-card mt-6 rounded-2xl border px-8 py-16 text-center">
          <p className="font-serif text-xl italic">No books match.</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Try a different search, or clear the filters.
          </p>
          <Link
            href="/requests"
            className="bg-brand text-brand-foreground mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Ask someone to list it
          </Link>
        </div>
      )}
    </>
  );
}
