import { Leaf, Star, Trophy } from "lucide-react";

import { getLeaderboard } from "@/lib/analytics";
import { CO2_KG_PER_BOOK, TREES_PER_BOOK } from "@/lib/pricing";
import { getStats } from "@/lib/store";

export const metadata = {
  title: "Leaderboard",
  description: "Which schools are passing the most knowledge forward.",
};
export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage() {
  const [{ schools, sellers }, stats] = await Promise.all([getLeaderboard(), getStats()]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Leaderboard</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">
        Which school passes the most forward?
      </h1>
      <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
        Every book rehomed is money saved for one student and waste avoided for
        everyone. Here&apos;s who&apos;s doing the most of it.
      </p>

      {/* ------------------------------------------------------- Eco headline */}
      <div className="border-brand/40 bg-brand/5 mt-10 rounded-2xl border p-8 text-center">
        <Leaf className="text-brand mx-auto size-7" />
        <p className="text-brand mt-4 font-serif text-4xl font-semibold sm:text-5xl">
          {`${stats.co2Saved.toLocaleString("en-IN")} kg CO₂`}
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {`Kept out of the air by ${stats.booksListed + stats.booksRehomed} books staying in circulation — roughly ${stats.treesSaved} trees. Each reused textbook saves about ${CO2_KG_PER_BOOK} kg of CO₂ and ${TREES_PER_BOOK} of a tree.`}
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {/* ------------------------------------------------------------ Schools */}
        <section>
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <Trophy className="text-brand size-5" />
            Top schools
          </h2>

          {schools.length === 0 ? (
            <p className="border-border text-muted-foreground mt-4 rounded-2xl border border-dashed p-8 text-center text-sm">
              No schools on the board yet.
            </p>
          ) : (
            <ol className="mt-5 space-y-2">
              {schools.map((school, index) => (
                <li
                  key={school.school}
                  className="border-border bg-card flex items-center gap-4 rounded-xl border p-4"
                >
                  <span className="w-7 shrink-0 text-center text-lg">
                    {MEDALS[index] ?? (
                      <span className="text-muted-foreground text-sm font-semibold">
                        {index + 1}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{school.school}</span>
                  <span className="shrink-0 text-right">
                    <span className="text-brand font-serif text-lg font-semibold">
                      {school.sold}
                    </span>
                    <span className="text-muted-foreground block text-[0.65rem]">
                      {`${school.books} listed`}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ------------------------------------------------------------ Sellers */}
        <section>
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <Star className="text-brand size-5" />
            Top sellers
          </h2>

          {sellers.length === 0 ? (
            <p className="border-border text-muted-foreground mt-4 rounded-2xl border border-dashed p-8 text-center text-sm">
              No completed sales yet — the first one lands here.
            </p>
          ) : (
            <ol className="mt-5 space-y-2">
              {sellers.map((seller, index) => (
                <li
                  key={`${seller.name}-${index}`}
                  className="border-border bg-card flex items-center gap-4 rounded-xl border p-4"
                >
                  <span className="w-7 shrink-0 text-center text-lg">
                    {MEDALS[index] ?? (
                      <span className="text-muted-foreground text-sm font-semibold">
                        {index + 1}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{seller.name}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {seller.school}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="text-brand font-serif text-lg font-semibold">
                      {seller.sold}
                    </span>
                    {seller.rating > 0 ? (
                      <span className="text-muted-foreground flex items-center justify-end gap-0.5 text-[0.65rem]">
                        <Star className="fill-brand text-brand size-2.5" />
                        {seller.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
