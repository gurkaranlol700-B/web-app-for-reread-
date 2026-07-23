"use server";

import { redirect } from "next/navigation";

import { createSession, destroySession } from "@/lib/auth";
import { IS_CLOUD_DEMO } from "@/lib/cloud";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createUser, findUserByEmail } from "@/lib/store";

export type AuthFormState = { error?: string };

/** Only allow same-site relative redirect targets (`/sell`), never `https://evil.com`. */
function safeNext(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = email ? findUserByEmail(email) : undefined;
  // One vague message for both "no such user" and "wrong password" — never
  // tell an attacker which emails have accounts.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Wrong email or password. Try again." };
  }

  await createSession(user.email);
  redirect(safeNext(formData.get("next")));
}

export async function signup(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Mirror of the /signup page's cloud gate — can't be bypassed with a crafted request.
  if (IS_CLOUD_DEMO) {
    return { error: "Public sign-ups arrive in Version 2." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { error: "Please enter your name." };
  if (school.length < 2) return { error: "Please enter your school." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "That email doesn't look right." };
  if (password.length < 3) return { error: "Password needs at least 3 characters." };
  if (findUserByEmail(email)) {
    return { error: "An account with this email already exists — try logging in instead." };
  }

  try {
    createUser({
      name,
      school,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    });
  } catch {
    return { error: "Couldn't create your account — please try again." };
  }
  await createSession(email);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
