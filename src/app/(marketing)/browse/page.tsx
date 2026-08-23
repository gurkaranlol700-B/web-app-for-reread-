import { BrowseGrid } from "@/components/marketplace/browse-grid";
import { getCurrentUser } from "@/lib/auth";
import { getActiveAds, trackAdEvent } from "@/lib/monetize";
import { getCatalog } from "@/lib/store";
import { getWishlistIds } from "@/lib/wishlist";

export const metadata = {
  title: "Browse books",
  description:
    "Every textbook on ReRead — search by title or publisher, filter by class and subject, and buy from students near you.",
};
export const dynamic = "force-dynamic";

/**
 * The full shelf: real listings with instant client-side search, filters and
 * sort, plus sponsored cards for everyone who isn't a Plus member.
 */
export default async function BrowsePage() {
  const user = await getCurrentUser();

  const [books, savedIds, ads] = await Promise.all([
    getCatalog(),
    user ? getWishlistIds(user.id) : Promise.resolve(new Set<string>()),
    // Revenue stream three, and one of the reasons to pay for Plus: members
    // see no advertising at all.
    user?.isPlus ? Promise.resolve([]) : getActiveAds(3),
  ]);

  // One impression per ad per page view, counted server-side so ad blockers
  // can't quietly deflate an advertiser's numbers.
  for (const ad of ads) void trackAdEvent(ad.id, "impression");

  return (
    <div className="mx-auto w-full max-w-[90rem] px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Explore</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">
        Every book, one shelf.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
        {`${books.length} books listed by students near you. Search by title or publisher, filter by class and subject.`}
      </p>

      <BrowseGrid books={books} savedIds={[...savedIds]} ads={ads} />
    </div>
  );
}
