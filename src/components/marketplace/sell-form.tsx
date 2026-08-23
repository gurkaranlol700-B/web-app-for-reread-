"use client";

import { useActionState, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";

import { createListing, type ListingFormState } from "@/app/actions/listing";
import { COMMISSION_PERCENT, PLUS_COMMISSION_PERCENT, rupees } from "@/lib/pricing";
import { bandFor, type PriceGuide } from "@/lib/price-band";

const MAX_PHOTO_MB = 4;

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

export function SellForm({
  priceGuide,
  sellerIsPlus = false,
}: {
  priceGuide: PriceGuide;
  sellerIsPlus?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(
    createListing,
    {},
  );
  // Oversized photos are caught HERE, before the request is even sent — an
  // instant, friendly message instead of a failed upload.
  const [clientError, setClientError] = useState<string | null>(null);

  // Live pricing help. Sellers guess wildly on an empty price box, and both
  // kinds of wrong guess (way too high, way too low) cost everyone a sale.
  const [subject, setSubject] = useState("Physics");
  const [price, setPrice] = useState<number>(0);
  const [preview, setPreview] = useState<string | null>(null);

  const band = bandFor(priceGuide, subject);
  const feePercent = sellerIsPlus ? PLUS_COMMISSION_PERCENT : COMMISSION_PERCENT;
  const fee = Math.round((price * feePercent) / 100);
  const youGet = Math.max(0, price - fee);

  const priceVerdict =
    price <= 0
      ? null
      : price > band.high * 1.35
        ? { tone: "warn", text: "That's well above what similar books sell for — expect a slow sale." }
        : price < band.low * 0.6
          ? { tone: "warn", text: "You're underselling. Students would happily pay more than this." }
          : { tone: "good", text: "Priced right — books in this range sell fastest." };

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
          <select
            name="subject"
            className={inputCls}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
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
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
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

      {/* ------------------------------------------------- Live price coaching
          Real percentiles from what's actually selling on ReRead, plus an
          honest, up-front statement of our cut. A seller who is surprised by
          the fee at payout time is a seller who never lists again. */}
      <div className="border-border bg-card rounded-2xl border p-5">
        <p className="text-brand flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="size-4" />
          {band.sampleSize > 0
            ? `${subject} books like yours sell for ${rupees(band.low)}–${rupees(band.high)}`
            : "Price guide"}
        </p>
        {band.sampleSize > 0 ? (
          <p className="text-muted-foreground mt-1 text-xs">
            {`Based on ${band.sampleSize} real ${band.sampleSize === 1 ? "listing" : "listings"} on ReRead. Most sell near ${rupees(band.median)}.`}
          </p>
        ) : null}

        {priceVerdict ? (
          <p
            className={`mt-3 text-sm font-medium ${
              priceVerdict.tone === "good"
                ? "text-brand"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {priceVerdict.text}
          </p>
        ) : null}

        {price > 0 ? (
          <div className="border-border mt-4 space-y-1.5 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyer pays</span>
              <span className="font-medium">{rupees(price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {`ReRead fee (${feePercent}%)`}
              </span>
              <span className="font-medium">{`− ${rupees(fee)}`}</span>
            </div>
            <div className="border-border flex justify-between border-t pt-1.5">
              <span className="font-semibold">You receive</span>
              <span className="text-brand font-serif text-lg font-semibold">
                {rupees(youGet)}
              </span>
            </div>
            {!sellerIsPlus ? (
              <p className="text-muted-foreground/80 flex items-start gap-1.5 pt-1 text-xs">
                <Sparkles className="mt-0.5 size-3 shrink-0" />
                {`ReRead Plus members pay only ${PLUS_COMMISSION_PERCENT}% — you'd keep ${rupees(price - Math.round((price * PLUS_COMMISSION_PERCENT) / 100))} on this book.`}
              </p>
            ) : null}
          </div>
        ) : null}
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
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Revoke the previous object URL so picking six photos in a row
            // doesn't leak six blobs.
            setPreview((old) => {
              if (old) URL.revokeObjectURL(old);
              return file ? URL.createObjectURL(file) : null;
            });
            if (file && file.size > MAX_PHOTO_MB * 1024 * 1024) {
              setClientError(
                `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep it under ${MAX_PHOTO_MB} MB.`,
              );
            } else {
              setClientError(null);
            }
          }}
        />
        <span className="text-muted-foreground/70 mt-1.5 block text-xs">
          JPG, PNG or WebP, up to 4 MB. A clear photo of the actual copy sells faster.
        </span>

        {preview ? (
          <span className="border-border bg-accent/30 mt-3 flex items-center gap-4 rounded-xl border p-3">
            {/* Deliberately a plain <img>: this is a local blob: URL that
                next/image can't optimise, and it disappears on submit. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="The photo you selected"
              className="size-20 rounded-lg object-contain"
            />
            <span className="text-muted-foreground text-xs">
              This is exactly what buyers will see. Straight-on, good light, no glare.
            </span>
          </span>
        ) : null}
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
