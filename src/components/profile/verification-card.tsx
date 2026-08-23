"use client";

import { useActionState } from "react";
import { BadgeCheck, Clock, ShieldAlert } from "lucide-react";

import { submitVerification, type VerifyState } from "@/app/actions/profile";

/**
 * Verified Student.
 *
 * Trust is the product in a marketplace of strangers, and this is the cheapest
 * signal a 16-year-old can give that they are who they say they are. Verified
 * sellers get a tick on every listing, which measurably shifts who buyers
 * choose.
 */
export function VerificationCard({ status }: { status: string }) {
  const [state, formAction, pending] = useActionState<VerifyState, FormData>(
    submitVerification,
    {},
  );

  if (state.done || status === "pending") {
    return (
      <div className="border-border bg-card rounded-2xl border p-6">
        <p className="text-brand flex items-center gap-2 font-semibold">
          <Clock className="size-4" />
          Verification pending
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          We&apos;re checking your ID. This is usually done within a few hours —
          you&apos;ll get a notification either way.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="border-border bg-card rounded-2xl border p-6">
      <p className="text-brand flex items-center gap-2 font-semibold">
        <BadgeCheck className="size-4" />
        Become a Verified Student
      </p>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        Upload a photo of your school ID card. Once a person at ReRead confirms
        it, a verified tick appears on everything you list — and buyers pick
        verified sellers first.
      </p>

      {status === "rejected" ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          Your last submission wasn&apos;t clear enough to read. Try a sharper,
          well-lit photo.
        </p>
      ) : null}

      <input
        name="idCard"
        type="file"
        required
        accept="image/jpeg,image/png,image/webp"
        className="file:bg-brand file:text-brand-foreground text-muted-foreground mt-4 w-full cursor-pointer text-sm file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:px-4 file:py-2 file:text-xs file:font-semibold"
      />
      <p className="text-muted-foreground/70 mt-2 text-xs">
        Only ReRead staff ever see this image. It is never shown on your profile.
      </p>

      {state.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="border-border hover:border-brand hover:text-brand mt-4 inline-flex h-11 w-full items-center justify-center rounded-full border text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Submit for verification"}
      </button>
    </form>
  );
}
