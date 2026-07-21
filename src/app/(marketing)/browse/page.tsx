import { BookCard } from "@/components/marketplace/book-card";
import { BOOKS } from "@/data/books";

export const metadata = { title: "Browse books" };

/**
 * Real listings, not a placeholder -- filtering by class/subject/board/price
 * is Milestone 4, but showing the marketplace populated and browsable now
 * (with demo data) makes the product feel alive rather than empty.
 */
export default function BrowsePage() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Explore</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">
        Every book, one shelf.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
        {`${BOOKS.length} books listed by students near you. Filtering by class, subject, board and price is coming in Milestone 4 — for now, here’s everything.`}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {BOOKS.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
}
