"use client";

import { useActionState, useState } from "react";

import { createListing, type ListingFormState } from "@/app/actions/listing";

const MAX_PHOTO_MB = 5;

const labelCls = "mono-label text-muted-foreground";
const inputCls =
  "border-border bg-card focus-visible:ring-ring placeholder:text-muted-foreground/50 mt-1.5 w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none focus-visible:ring-2";

const SUBJECTS = [
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "Accountancy",
  "Economics",
  "Business Studies",
  "English",
  "Computer Science",
  "General",
];
const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const BOARDS = ["CBSE", "ICSE", "State Board", "JEE", "NEET", "Other"];
const CONDITIONS = ["New", "Like New", "Good", "Fair"];

/**
 * The seller agreement the user must accept before listing — checked again on
 * the server so it can't be bypassed by editing the page.
 */
const TERMS = [
  {
    name: "agreeCondition",
    text: "My book is genuinely in the condition I've described — it is not damaged beyond what I've stated, and no pages are missing.",
  },
  {
    name: "agreeRefund",
    text: "If the buyer isn't satisfied because the book doesn't match my description, I will take it back and give a full refund.",
  },
  {
    name: "agreeAccurate",
    text: "The details I've given are accurate, and this is an original copy — not a pirated print.",
  },
];

export function SellForm() {
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(
    createListing,
    {},
  );
  // Oversized photos are caught HERE, before the request is even sent — an
  // instant, friendly message instead of a failed upload.
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem("cover");
        const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
        if (file && file.size > MAX_PHOTO_MB * 1024 * 1024) {
          e.preventDefault();
          setClientError(
            `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep it under ${MAX_PHOTO_MB} MB. Tip: send it through WhatsApp to yourself or take a screenshot of it to shrink it.`,
          );
          return;
        }
        setClientError(null);
      }}
      className="mt-10 space-y-6"
    >
      <label className="block">
        <span className={labelCls}>Book name</span>
        <input
          name="title"
          type="text"
          required
          minLength={3}
          placeholder="e.g. H.C. Verma Concepts of Physics Vol 1"
          className={inputCls}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Subject</span>
          <select name="subject" className={inputCls} defaultValue="Physics">
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Class</span>
          <select name="bookClass" className={inputCls} defaultValue="Class 12">
            {CLASSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Board / Exam</span>
          <select name="board" className={inputCls} defaultValue="CBSE">
            {BOARDS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Publication</span>
          <input
            name="publication"
            type="text"
            placeholder="e.g. Bharati Bhawan"
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className={labelCls}>Condition</span>
          <select name="condition" className={inputCls} defaultValue="Good">
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Your price (₹)</span>
          <input
            name="price"
            type="number"
            required
            min={10}
            step={1}
            placeholder="150"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Original MRP (₹, optional)</span>
          <input
            name="originalPrice"
            type="number"
            min={10}
            step={1}
            placeholder="980"
            className={inputCls}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelCls}>Describe your book</span>
        <textarea
          name="description"
          required
          minLength={10}
          rows={4}
          placeholder="Condition details, markings, missing pages, why you're selling…"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Photo of the book</span>
        <input
          name="cover"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp"
          className="file:bg-brand file:text-brand-foreground text-muted-foreground mt-1.5 w-full cursor-pointer text-sm file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:px-4 file:py-2 file:text-xs file:font-semibold"
        />
        <span className="text-muted-foreground/70 mt-1.5 block text-xs">
          JPG, PNG or WebP, up to 5 MB. A clear photo of the actual copy sells faster.
        </span>
      </label>

      <fieldset className="border-border bg-card rounded-2xl border p-5">
        <legend className="mono-label text-brand px-2">Seller agreement</legend>
        <div className="space-y-4">
          {TERMS.map((term) => (
            <label key={term.name} className="flex items-start gap-3 text-sm leading-relaxed">
              <input
                type="checkbox"
                name={term.name}
                required
                className="accent-brand mt-0.5 size-4 shrink-0"
              />
              <span className="text-muted-foreground">{term.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {clientError || state.error ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {clientError ?? state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-brand-foreground inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Listing your book…" : "List my book"}
      </button>
    </form>
  );
}
