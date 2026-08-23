"use client";

import { useActionState, useState } from "react";

import { createCampaign, type AdDraftState } from "@/app/actions/monetize";
import { AD_PLANS } from "@/lib/pricing";
import { rupees } from "@/lib/pricing";

const labelCls = "mono-label text-muted-foreground";
const inputCls =
  "border-border bg-card focus-visible:ring-ring placeholder:text-muted-foreground/50 mt-1.5 w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none focus-visible:ring-2";

/**
 * Self-serve campaign creation. A coaching institute fills this in, pays, and
 * their ad is in the queue — no sales call, no invoice, no human in the loop.
 * That is the only way ad revenue works at this size.
 */
export function CampaignForm() {
  const [state, formAction, pending] = useActionState<AdDraftState, FormData>(createCampaign, {});
  const [planId, setPlanId] = useState<string>(AD_PLANS[1].id);
  const [headline, setHeadline] = useState("");

  return (
    <form action={formAction} className="mt-10 space-y-6">
      <div>
        <span className={labelCls}>Choose a package</span>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {AD_PLANS.map((plan) => {
            const selected = plan.id === planId;
            return (
              <label
                key={plan.id}
                className={`relative cursor-pointer rounded-2xl border p-4 transition-colors ${
                  selected ? "border-brand bg-brand/5" : "border-border bg-card hover:border-brand/40"
                }`}
              >
                <input
                  type="radio"
                  name="planId"
                  value={plan.id}
                  checked={selected}
                  onChange={() => setPlanId(plan.id)}
                  className="sr-only"
                />
                {"badge" in plan && plan.badge ? (
                  <span className="bg-brand text-brand-foreground absolute -top-2 right-3 rounded-full px-2 py-0.5 text-[0.6rem] font-bold">
                    {plan.badge}
                  </span>
                ) : null}
                <p className="font-medium">{plan.label}</p>
                <p className="text-brand mt-1 font-serif text-2xl font-semibold">
                  {rupees(plan.price)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">{plan.impressions}</p>
              </label>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className={labelCls}>Your organisation</span>
        <input
          name="advertiserName"
          type="text"
          required
          minLength={2}
          placeholder="e.g. Vidya Coaching Institute"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Headline</span>
        <input
          name="headline"
          type="text"
          required
          minLength={4}
          maxLength={70}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Crack JEE 2027 — free demo class this Sunday"
          className={inputCls}
        />
        <span className="text-muted-foreground/70 mt-1.5 block text-xs">
          {`${headline.length}/70 characters`}
        </span>
      </label>

      <label className="block">
        <span className={labelCls}>Supporting line (optional)</span>
        <input
          name="body"
          type="text"
          maxLength={160}
          placeholder="e.g. Small batches, IIT faculty, South Delhi"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Where should it link?</span>
        <input
          name="targetUrl"
          type="url"
          required
          placeholder="https://your-website.com"
          className={inputCls}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Button text</span>
          <input
            name="ctaLabel"
            type="text"
            maxLength={24}
            defaultValue="Learn more"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Logo or image (optional)</span>
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="file:bg-brand file:text-brand-foreground text-muted-foreground mt-1.5 w-full cursor-pointer text-sm file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:px-4 file:py-2 file:text-xs file:font-semibold"
          />
        </label>
      </div>

      <p className="text-muted-foreground border-border rounded-xl border border-dashed p-4 text-xs leading-relaxed">
        Every campaign is reviewed by a person before it runs. We turn down
        anything that isn&apos;t genuinely useful to students — the whole point
        of advertising here is that our users don&apos;t resent it.
      </p>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-brand-foreground inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Continue to payment"}
      </button>
    </form>
  );
}
