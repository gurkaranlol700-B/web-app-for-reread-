"use client";

import { useActionState } from "react";

import { postRequest, type RequestState } from "@/app/actions/requests";

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
const CLASSES = ["", "Class 9", "Class 10", "Class 11", "Class 12", "JEE", "NEET"];

export function RequestForm() {
  const [state, formAction, pending] = useActionState<RequestState, FormData>(postRequest, {});

  if (state.done) {
    return (
      <div className="border-brand/40 bg-brand/5 rounded-2xl border p-6 text-center">
        <p className="font-serif text-lg italic">Posted.</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Sellers at your school can see it now. We&apos;ll notify you the moment
          someone has it.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="border-border bg-card space-y-5 rounded-2xl border p-6">
      <label className="block">
        <span className={labelCls}>Which book do you need?</span>
        <input
          name="title"
          type="text"
          required
          minLength={3}
          placeholder="e.g. TS Grewal Accountancy Class 12 Vol 2"
          className={inputCls}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
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
        <label className="block">
          <span className={labelCls}>Most you&apos;d pay (₹)</span>
          <input name="maxPrice" type="number" min={0} placeholder="200" className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>Anything else? (optional)</span>
        <input
          name="note"
          type="text"
          maxLength={400}
          placeholder="e.g. Latest edition only, can collect from Rohini"
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
        {pending ? "Posting…" : "Post request"}
      </button>
    </form>
  );
}
