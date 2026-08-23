"use client";

import { useActionState } from "react";

import { completeProfile, type WelcomeState } from "@/app/actions/welcome";

const labelCls = "mono-label text-muted-foreground";
const inputCls =
  "border-border bg-card focus-visible:ring-ring placeholder:text-muted-foreground/50 mt-1.5 w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none focus-visible:ring-2";

export function WelcomeForm() {
  const [state, formAction, pending] = useActionState<WelcomeState, FormData>(
    completeProfile,
    {},
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block">
        <span className={labelCls}>Your school</span>
        <input
          name="school"
          type="text"
          required
          minLength={2}
          autoFocus
          placeholder="e.g. Delhi Public School"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Class</span>
        <input
          name="className"
          type="text"
          placeholder="e.g. Class 12 (optional)"
          className={inputCls}
        />
      </label>

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
        {pending ? "Saving…" : "Start browsing"}
      </button>
    </form>
  );
}
