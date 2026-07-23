"use client";

import { useActionState } from "react";

import { login, type AuthFormState } from "@/app/actions/auth";

const labelCls = "mono-label text-muted-foreground";
const inputCls =
  "border-border bg-card focus-visible:ring-ring placeholder:text-muted-foreground/50 mt-1.5 w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none focus-visible:ring-2";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(login, {});

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next} />

      <label className="block">
        <span className={labelCls}>Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.com"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
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
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
