"use client";

import { useActionState } from "react";

import { createAlert, type AlertState } from "@/app/actions/wishlist";

const labelCls = "mono-label text-muted-foreground";
const inputCls =
  "border-border bg-card focus-visible:ring-ring placeholder:text-muted-foreground/50 mt-1.5 w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none focus-visible:ring-2";

const SUBJECTS = [
  "",
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "Accountancy",
  "Economics",
  "Business Studies",
  "English",
  "Computer Science",
];
const CLASSES = ["", "Class 9", "Class 10", "Class 11", "Class 12"];

export function AlertForm() {
  const [state, formAction, pending] = useActionState<AlertState, FormData>(createAlert, {});

  return (
    <form action={formAction} className="border-border bg-card space-y-4 rounded-2xl border p-5">
      <label className="block">
        <span className={labelCls}>Book name contains</span>
        <input
          name="keyword"
          type="text"
          placeholder="e.g. HC Verma"
          className={inputCls}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Subject</span>
          <select name="subject" className={inputCls} defaultValue="">
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s || "Any"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Class</span>
          <select name="className" className={inputCls} defaultValue="">
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c || "Any"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      {state.done ? (
        <p className="text-brand text-sm font-medium">
          Alert saved. We&apos;ll notify you when a match is listed.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="border-border hover:border-brand hover:text-brand inline-flex h-11 w-full items-center justify-center rounded-full border text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create alert"}
      </button>
    </form>
  );
}
