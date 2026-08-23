"use client";

import { useState } from "react";
import { Rocket, Sparkles } from "lucide-react";

import { PayButton } from "@/components/pay/pay-button";
import { isBoostActive } from "@/lib/featured";
import { BOOST_PLANS, rupees } from "@/lib/pricing";

/**
 * Revenue stream two, from the seller's side.
 *
 * The pitch is written for a student, not a marketer: "sellers pay a little to
 * get seen first" only converts if the seller can picture the outcome, so the
 * copy names the outcome rather than the feature.
 */
export function BoostPanel({
  listingId,
  buyerName,
  buyerEmail,
  boostCredits,
  featuredUntil,
}: {
  listingId: string;
  buyerName: string;
  buyerEmail: string;
  boostCredits: number;
  featuredUntil: string | null;
}) {
  const [planId, setPlanId] = useState<string>(BOOST_PLANS[0].id);
  const plan = BOOST_PLANS.find((p) => p.id === planId) ?? BOOST_PLANS[0];

  const boostedUntil = isBoostActive(featuredUntil) ? new Date(featuredUntil!) : null;

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <p className="text-brand flex items-center gap-2 text-sm font-semibold">
        <Rocket className="size-4" />
        {boostedUntil ? "This listing is boosted" : "Get seen first"}
      </p>

      {boostedUntil ? (
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          {`Leading the shelf until ${boostedUntil.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. You can extend it below — extra days are added on, never replaced.`}
        </p>
      ) : (
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Boosted books sit at the top of the shelf and on the homepage, with a
          gold Featured ribbon. Most sell within days instead of weeks.
        </p>
      )}

      {boostCredits > 0 ? (
        <p className="text-brand mt-3 flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-3.5" />
          {`You have ${boostCredits} free Plus ${boostCredits === 1 ? "boost" : "boosts"} — this one is free.`}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {BOOST_PLANS.map((option) => {
          const selected = option.id === planId;
          return (
            <label
              key={option.id}
              className={`relative cursor-pointer rounded-xl border p-4 transition-colors ${
                selected ? "border-brand bg-brand/5" : "border-border hover:border-brand/40"
              }`}
            >
              <input
                type="radio"
                name="boostPlan"
                value={option.id}
                checked={selected}
                onChange={() => setPlanId(option.id)}
                className="sr-only"
              />
              {"badge" in option && option.badge ? (
                <span className="bg-brand text-brand-foreground absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[0.6rem] font-bold">
                  {option.badge}
                </span>
              ) : null}
              <p className="font-medium">{option.label}</p>
              <p className="text-brand mt-0.5 font-serif text-xl font-semibold">
                {boostCredits > 0 ? "Free" : rupees(option.price)}
              </p>
            </label>
          );
        })}
      </div>

      <div className="mt-4">
        <PayButton
          kind="featured"
          refId={listingId}
          planId={plan.id}
          amount={plan.price}
          label={
            boostCredits > 0
              ? `Boost free for ${plan.label}`
              : `Boost for ${plan.label} · ${rupees(plan.price)}`
          }
          description={`Featured listing for ${plan.label}`}
          buyerName={buyerName}
          buyerEmail={buyerEmail}
        />
      </div>
    </div>
  );
}
