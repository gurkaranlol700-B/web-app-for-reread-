import { z } from "zod";

/**
 * Every server action validates its input here before touching the database.
 *
 * Server Actions are public HTTP endpoints — the form in the browser is a
 * convenience, not a guard. Anyone can POST whatever they like to one, so the
 * checks that matter are these, not the `required` attributes in the markup.
 *
 * Error messages are written to be read by a nervous 16-year-old seller, not
 * by a developer: say what to do, not what went wrong.
 */

const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const emailSchema = z
  .preprocess(trimmed, z.string().min(1, "Please enter your email."))
  .pipe(z.string().regex(/^\S+@\S+\.\S+$/, "That email doesn't look right."));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password."),
});

export const signupSchema = z.object({
  name: z.preprocess(trimmed, z.string().min(2, "Please enter your name.").max(60)),
  school: z.preprocess(trimmed, z.string().min(2, "Please enter your school.").max(80)),
  className: z.preprocess(trimmed, z.string().max(30).optional().default("")),
  email: emailSchema,
  password: z.string().min(3, "Password needs at least 3 characters.").max(200),
  referralCode: z.preprocess(trimmed, z.string().max(20).optional().default("")),
});

export const CONDITIONS = ["New", "Like New", "Good", "Fair"] as const;

export const listingSchema = z
  .object({
    title: z.preprocess(trimmed, z.string().min(3, "Please enter the book's name.").max(120)),
    subject: z.preprocess(trimmed, z.string().max(40).optional().default("")),
    bookClass: z.preprocess(trimmed, z.string().max(30).optional().default("")),
    board: z.preprocess(trimmed, z.string().max(30).optional().default("")),
    publication: z.preprocess(trimmed, z.string().max(60).optional().default("")),
    condition: z.enum(CONDITIONS, { message: "Please pick the book's condition." }),
    price: z.coerce.number().min(10, "Price must be at least ₹10.").max(100_000),
    originalPrice: z.coerce.number().max(200_000).optional(),
    description: z.preprocess(
      trimmed,
      z.string().min(10, "Tell buyers a little about the book (at least 10 characters).").max(1200),
    ),
  })
  .refine((v) => (v.originalPrice ?? v.price) >= v.price, {
    path: ["originalPrice"],
    message: "Original MRP can't be lower than your selling price.",
  });

export const messageSchema = z.object({
  conversationId: z.string().uuid("That conversation doesn't exist."),
  body: z.preprocess(
    trimmed,
    z.string().min(1, "Type a message first.").max(2000, "That message is too long."),
  ),
});

export const reviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Pick a star rating.").max(5),
  comment: z.preprocess(trimmed, z.string().max(600).optional().default("")),
});

export const bookRequestSchema = z.object({
  title: z.preprocess(trimmed, z.string().min(3, "Which book do you need?").max(120)),
  subject: z.preprocess(trimmed, z.string().max(40).optional().default("")),
  className: z.preprocess(trimmed, z.string().max(30).optional().default("")),
  maxPrice: z.coerce.number().min(0).max(100_000).optional().default(0),
  note: z.preprocess(trimmed, z.string().max(400).optional().default("")),
});

export const bookAlertSchema = z
  .object({
    keyword: z.preprocess(trimmed, z.string().max(60).optional().default("")),
    subject: z.preprocess(trimmed, z.string().max(40).optional().default("")),
    className: z.preprocess(trimmed, z.string().max(30).optional().default("")),
  })
  .refine((v) => v.keyword || v.subject || v.className, {
    message: "Choose at least one thing to be alerted about.",
  });

export const adSchema = z.object({
  advertiserName: z.preprocess(trimmed, z.string().min(2, "Who is advertising?").max(80)),
  headline: z.preprocess(trimmed, z.string().min(4, "Write a headline.").max(70)),
  body: z.preprocess(trimmed, z.string().max(160).optional().default("")),
  targetUrl: z.preprocess(
    trimmed,
    z.string().url("Enter a full link, starting with https://").max(400),
  ),
  ctaLabel: z.preprocess(trimmed, z.string().max(24).optional().default("Learn more")),
  planId: z.string().min(1, "Choose a package."),
});

export const handoverSchema = z.object({
  orderId: z.string().uuid(),
  code: z.preprocess(
    trimmed,
    z.string().regex(/^\d{6}$/, "The handover code is 6 digits."),
  ),
});

/**
 * Runs a schema over FormData and returns either the parsed value or the
 * single friendliest error message — server actions surface one message at a
 * time, so there's no point plumbing a whole error tree through.
 */
export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): { ok: true; data: z.output<T> } | { ok: false; error: string } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const first = result.error.issues[0];
  return { ok: false, error: first?.message ?? "Please check the form and try again." };
}
