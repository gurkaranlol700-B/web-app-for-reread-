"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { BookCard } from "@/components/marketplace/book-card";
import type { Book } from "@/data/books";

const selectCls =
  "border-border bg-card focus-visible:ring-ring h-11 rounded-full border px-4 text-sm transition-colors outline-none focus-visible:ring-2";

/**
 * Client-side search + filters over the full catalog. Everything happens
 * in-memory as you type — no server round trips, instant results.
 */
export function BrowseGrid({ books }: { books: Book[] }) {
  const [query, setQuery] = useState("");
  const [klass, setKlass] = useState("All classes");
  const [subject, setSubject] = useState("All subjects");

  const classes = useMemo(
    () => ["All classes", ...[...new Set(books.map((b) => b.className))].sort()],
    [books],
  );
  const subjects = useMemo(
    () => ["All subjects", ...[...new Set(books.map((b) => b.subject))].sort()],
    [books],
  );

  const q = query.trim().toLowerCase();
  const filtered = books.filter(
    (b) =>
      (klass === "All classes" || b.className === klass) &&
      (subject === "All subjects" || b.subject === subject) &&
      (!q ||
        `${b.title} ${b.publication} ${b.board} ${b.subject} ${b.sellerName} ${b.school}`
          .toLowerCase()
          .includes(q)),
  );

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-4 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, publisher, board, seller…"
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
      </div>

      <p className="text-muted-foreground mt-4 text-sm" aria-live="polite">
        {`${filtered.length} of ${books.length} books`}
      </p>

      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="border-border bg-card mt-6 rounded-2xl border px-8 py-16 text-center">
          <p className="font-serif text-xl italic">No books match.</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Try a different search, or clear the filters.
          </p>
        </div>
      )}
    </>
  );
}
