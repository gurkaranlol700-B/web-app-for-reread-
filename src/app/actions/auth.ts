"use server";

import { redirect } from "next/navigation";

import { createSession, destroySession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { hashPassword, verifyPassword } from "@/lib/password";
import { REFERRAL_BOOST_CREDITS, REFERRAL_WALLET_CREDIT, rupees } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";
import {
  bumpUser,
  createUser,
  findUserByEmail,
  findUserByReferralCode,
  type User,
} from "@/lib/store";
import { loginSchema, parseForm, signupSchema } from "@/lib/validation";

export type AuthFormState = { error?: string };

/** Only allow same-site relative redirect targets (`/sell`), never `https://evil.com`. */
function safeNext(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { email, password } = parsed.data;

  // Slows password guessing to a crawl without ever locking out a real
  // student who fat-fingered their password twice.
  const gate = rateLimit(`login:${email.toLowerCase()}`, 8, 60_000);
  if (!gate.allowed) {
    return { error: `Too many attempts. Try again in ${gate.retryAfterSeconds}s.` };
  }

  let user: User | null = null;
  try {
    user = await findUserByEmail(email);
  } catch {
    return { error: "Can't reach the server right now — please try again." };
  }

  // One vague message for both "no such user" and "wrong password" — never
  // tell an attacker which emails have accounts.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Wrong email or password. Try again." };
  }

  await createSession(user);
  redirect(safeNext(formData.get("next")));
}

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseForm(signupSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const { name, school, className, email, password, referralCode } = parsed.data;

  const gate = rateLimit(`signup:${email.toLowerCase()}`, 5, 300_000);
  if (!gate.allowed) {
    return { error: `Too many sign-up attempts. Try again in ${gate.retryAfterSeconds}s.` };
  }

  let created: User;
  try {
    if (await findUserByEmail(email)) {
      return { error: "An account with this email already exists — try logging in instead." };
    }

    const referrer = referralCode ? await findUserByReferralCode(referralCode) : null;

    created = await createUser({
      name,
      school,
      className,
      email,
      passwordHash: hashPassword(password),
      referredBy: referrer?.id ?? null,
    });

    // Both sides of a referral get paid — that symmetry is what makes people
    // actually share the code.
    if (referrer) {
      await Promise.all([
        bumpUser(referrer.id, "boost_credits", REFERRAL_BOOST_CREDITS),
        bumpUser(created.id, "wallet_credit", REFERRAL_WALLET_CREDIT),
        notify({
          userId: referrer.id,
          kind: "referral",
          title: `${name} joined with your code`,
          body: `You earned a free listing boost. Keep sharing ${referrer.referralCode}.`,
          link: "/profile",
        }),
      ]);
    }

    await notify({
      userId: created.id,
      kind: "system",
      title: "Welcome to ReRead",
      body: referrer
        ? `You've got ${rupees(REFERRAL_WALLET_CREDIT)} credit off your first book. List a book to start earning.`
        : "List your first book — it takes about a minute.",
      link: "/sell",
    });
  } catch {
    return { error: "Couldn't create your account — please try again." };
  }

  await createSession(created);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
