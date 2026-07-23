import { BrowseGrid } from "@/components/marketplace/browse-grid";
import { getCatalog } from "@/lib/store";

export const metadata = { title: "Browse books" };

/**
 * The full shelf: real user listings (newest first) merged with the demo
 * catalog, with instant client-side search and class/subject filters.
 */
export default function BrowsePage() {
  const books = getCatalog();

  return (
    <div className="mx-auto w-full max-w-[90rem] px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Explore</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">
        Every book, one shelf.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
        {`${books.length} books listed by students near you. Search by title or publisher, filter by class and subject.`}
      </p>

      <BrowseGrid books={books} />
    </div>
  );
}
