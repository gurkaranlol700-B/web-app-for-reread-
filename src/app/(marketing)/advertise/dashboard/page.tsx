import Link from "next/link";
import { redirect } from "next/navigation";
import { MousePointerClick, Eye, Megaphone } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getAdsByAdvertiser } from "@/lib/monetize";
import { rupees } from "@/lib/pricing";

export const metadata = { title: "Your campaigns" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Under review",
  active: "Running",
  paused: "Paused",
  rejected: "Not approved",
};

export default async function AdvertiserDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advertise/dashboard");

  const ads = await getAdsByAdvertiser(user.id);
  const totals = ads.reduce(
    (sum, ad) => ({
      spend: sum.spend + ad.budget,
      impressions: sum.impressions + ad.impressions,
      clicks: sum.clicks + ad.clicks,
    }),
    { spend: 0, impressions: 0, clicks: 0 },
  );
  const ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Advertiser</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">Your campaigns.</h1>

      {ads.length === 0 ? (
        <div className="border-border bg-card mt-10 rounded-2xl border px-8 py-16 text-center">
          <Megaphone className="text-brand mx-auto size-8" />
          <p className="mt-4 font-serif text-xl italic">No campaigns yet.</p>
          <Link
            href="/advertise"
            className="bg-brand text-brand-foreground mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            Create your first campaign
          </Link>
        </div>
      ) : (
        <>
          <div className="border-border mt-10 grid grid-cols-2 gap-6 border-t pt-8 sm:grid-cols-4">
            <Stat label="Total spend" value={rupees(totals.spend)} />
            <Stat label="Impressions" value={totals.impressions.toLocaleString("en-IN")} />
            <Stat label="Clicks" value={totals.clicks.toLocaleString("en-IN")} />
            <Stat label="Click rate" value={`${ctr.toFixed(2)}%`} />
          </div>

          <ul className="mt-10 space-y-3">
            {ads.map((ad) => {
              const adCtr = ad.impressions ? (ad.clicks / ad.impressions) * 100 : 0;
              return (
                <li key={ad.id} className="border-border bg-card rounded-2xl border p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{ad.headline}</p>
                      <p className="text-muted-foreground mt-0.5 text-sm">{ad.advertiserName}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        ad.status === "active"
                          ? "bg-brand/10 text-brand"
                          : ad.status === "rejected"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {STATUS_LABEL[ad.status] ?? ad.status}
                    </span>
                  </div>

                  <div className="text-muted-foreground mt-4 flex flex-wrap gap-5 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Eye className="size-3.5" />
                      {`${ad.impressions.toLocaleString("en-IN")} views`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MousePointerClick className="size-3.5" />
                      {`${ad.clicks.toLocaleString("en-IN")} clicks`}
                    </span>
                    <span>{`${adCtr.toFixed(2)}% CTR`}</span>
                    <span>{rupees(ad.budget)}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href="/advertise"
            className="bg-brand text-brand-foreground mt-8 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            New campaign
          </Link>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-brand font-serif text-3xl font-semibold">{value}</p>
      <p className="mono-label text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
