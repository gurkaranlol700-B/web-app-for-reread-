import { notFound, redirect } from "next/navigation";

import { SponsoredCard } from "@/components/ads/sponsored-card";
import { PayButton } from "@/components/pay/pay-button";
import { getCurrentUser } from "@/lib/auth";
import { findAdPlan, getAdsByAdvertiser } from "@/lib/monetize";
import { rupees } from "@/lib/pricing";

export const metadata = { title: "Pay for your campaign" };
export const dynamic = "force-dynamic";

export default async function AdPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const [{ id }, { plan: planId }] = await Promise.all([params, searchParams]);

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/advertise/pay/${id}`);

  // Only the advertiser who created the draft can pay for it.
  const ads = await getAdsByAdvertiser(user.id);
  const ad = ads.find((candidate) => candidate.id === id);
  if (!ad) notFound();

  const plan = findAdPlan(planId ?? "");
  const amount = plan?.price ?? ad.budget;

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Almost there</span>
      <h1 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05]">
        Here&apos;s how it will look.
      </h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        This is the exact card students will see in the shelf, marked Sponsored.
      </p>

      <div className="mt-8">
        <SponsoredCard ad={ad} preview />
      </div>

      <div className="border-border bg-card mt-8 rounded-2xl border p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground text-sm">{plan?.label ?? "Campaign"}</span>
          <span className="font-serif text-3xl font-semibold">{rupees(amount)}</span>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          {plan?.impressions ?? "Campaign budget"} · reviewed before it goes live
        </p>

        <div className="mt-5">
          <PayButton
            kind="ad"
            refId={ad.id}
            planId={plan?.id ?? ""}
            amount={amount}
            label={`Pay ${rupees(amount)}`}
            description={`ReRead advertising — ${plan?.label ?? "campaign"}`}
            buyerName={user.name}
            buyerEmail={user.email}
          />
        </div>
      </div>
    </div>
  );
}
