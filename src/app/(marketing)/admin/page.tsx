import Image from "next/image";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Leaf,
  MessageSquare,
  Percent,
  Receipt,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import { moderateAd } from "@/app/actions/monetize";
import {
  RevenueByStream,
  RevenueOverTime,
  SchoolsChart,
} from "@/components/admin/revenue-charts";
import { requireAdmin } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/analytics";
import { getAllAds } from "@/lib/monetize";
import { rupees, rupeesCompact } from "@/lib/pricing";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Not a 404 — the owner reaching this while logged out should just log in.
  const admin = await requireAdmin();
  if (!admin) redirect("/login?next=/admin");

  const [snapshot, ads] = await Promise.all([getAdminSnapshot(), getAllAds()]);
  const pendingAds = ads.filter((ad) => ad.status === "pending");

  return (
    <div className="mx-auto w-full max-w-[80rem] px-6 py-12 sm:px-10 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono-label text-brand">Internal</span>
          <h1 className="mt-2 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">
            How ReRead is doing.
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Live, from the database — nothing on this page is typed in by hand.
        </p>
      </div>

      {/* --------------------------------------------------------- Headline KPIs */}
      <div className="border-border mt-10 grid grid-cols-2 gap-6 border-t pt-8 lg:grid-cols-4">
        <Kpi
          icon={TrendingUp}
          label="Marketplace volume"
          value={rupeesCompact(snapshot.gmv)}
          hint={`${snapshot.ordersCompleted} completed sales`}
        />
        <Kpi
          icon={Receipt}
          label="ReRead revenue"
          value={rupeesCompact(snapshot.revenue)}
          hint="all four streams"
          highlight
        />
        <Kpi
          icon={Percent}
          label="Take rate"
          value={`${snapshot.takeRate.toFixed(1)}%`}
          hint="revenue ÷ volume"
        />
        <Kpi
          icon={Users}
          label="Students"
          value={String(snapshot.students)}
          hint={`${snapshot.plusMembers} on Plus`}
        />
      </div>

      {/* ------------------------------------------------------------- Charts */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="border-border bg-card rounded-2xl border p-6">
          <h2 className="font-serif text-lg font-medium">Volume and revenue, last 14 days</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            The gap between the two lines is what students kept.
          </p>
          <div className="mt-4">
            <RevenueOverTime data={snapshot.daily} />
          </div>
          <div className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs">
            <Legend color="#2AA79B" label="Books sold (value)" />
            <Legend color="#E0A81C" label="ReRead revenue" />
          </div>
        </section>

        <section className="border-border bg-card rounded-2xl border p-6">
          <h2 className="font-serif text-lg font-medium">Revenue by stream</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Four ways to earn, so no single one has to carry the business.
          </p>
          <div className="mt-4">
            <RevenueByStream data={snapshot.byKind} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="border-border bg-card rounded-2xl border p-6">
          <h2 className="font-serif text-lg font-medium">Schools</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Where the supply is. Each new school is its own closed market.
          </p>
          <div className="mt-4">
            <SchoolsChart data={snapshot.topSchools} />
          </div>
        </section>

        <section className="border-border bg-card rounded-2xl border p-6">
          <h2 className="font-serif text-lg font-medium">Engagement</h2>
          <div className="mt-5 grid grid-cols-2 gap-6">
            <Mini icon={MessageSquare} label="Messages sent" value={snapshot.messages} />
            <Mini icon={Star} label="Reviews written" value={snapshot.reviews} />
            <Mini icon={Sparkles} label="Books on sale" value={snapshot.listingsActive} />
            <Mini icon={BadgeCheck} label="Books rehomed" value={snapshot.listingsSold} />
          </div>

          <div className="border-brand/30 bg-brand/5 mt-6 rounded-xl border p-4">
            <p className="text-brand flex items-center gap-2 text-sm font-semibold">
              <Leaf className="size-4" />
              Environmental impact
            </p>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              {`${snapshot.co2Saved} kg of CO₂ and ${snapshot.treesSaved} trees saved by keeping ${snapshot.listingsSold} books in circulation.`}
            </p>
          </div>

          <dl className="text-muted-foreground mt-5 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt>Average sale</dt>
              <dd className="font-medium">{rupees(snapshot.averageOrder)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Orders in progress</dt>
              <dd className="font-medium">{snapshot.ordersLive}</dd>
            </div>
            {snapshot.simulatedShare > 0 ? (
              <div className="flex justify-between">
                <dt>Recorded offline (no live charge)</dt>
                <dd className="font-medium">{`${snapshot.simulatedShare.toFixed(0)}%`}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      {/* --------------------------------------------------------- Ad moderation */}
      <section className="border-border bg-card mt-6 rounded-2xl border p-6">
        <h2 className="font-serif text-lg font-medium">
          {`Ad queue${pendingAds.length ? ` · ${pendingAds.length} waiting` : ""}`}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Nothing runs until you approve it. Students see what we let through.
        </p>

        {ads.length === 0 ? (
          <p className="text-muted-foreground mt-6 text-sm">No campaigns yet.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {ads.map((ad) => (
              <li
                key={ad.id}
                className="border-border flex flex-wrap items-center gap-4 rounded-xl border p-4"
              >
                {ad.imageUrl ? (
                  <div className="bg-accent/30 relative size-12 shrink-0 overflow-hidden rounded-lg">
                    <Image src={ad.imageUrl} alt="" fill sizes="48px" className="object-contain p-1" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ad.headline}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {`${ad.advertiserName} · ${rupees(ad.budget)} · ${ad.impressions} views · ${ad.clicks} clicks`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {(["active", "paused", "rejected"] as const)
                    .filter((status) => status !== ad.status)
                    .map((status) => (
                      <form key={status} action={moderateAd}>
                        <input type="hidden" name="adId" value={ad.id} />
                        <input type="hidden" name="status" value={status} />
                        <button
                          type="submit"
                          className="border-border hover:border-foreground rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors"
                        >
                          {status === "active" ? "Approve" : status}
                        </button>
                      </form>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        className={`flex size-10 items-center justify-center rounded-xl ${
          highlight ? "bg-brand text-brand-foreground" : "bg-accent/40 text-brand"
        }`}
      >
        <Icon className="size-4.5" />
      </div>
      <p className="text-brand mt-3 font-serif text-3xl font-semibold">{value}</p>
      <p className="mono-label text-muted-foreground mt-1">{label}</p>
      <p className="text-muted-foreground/70 mt-0.5 text-xs">{hint}</p>
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div>
      <Icon className="text-brand size-4" />
      <p className="mt-2 font-serif text-2xl font-semibold">{value.toLocaleString("en-IN")}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
