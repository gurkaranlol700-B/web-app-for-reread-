"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/store";
import { parseForm } from "@/lib/validation";
import { z } from "zod";

const welcomeSchema = z.object({
  school: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(2, "Please enter your school.").max(80),
  ),
  className: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().max(30).optional().default(""),
  ),
});

export type WelcomeState = { error?: string };

/**
 * Social sign-ups arrive with a name and an email but no school, and school is
 * the thing ReRead is organised around — it decides who sees your listing and
 * who you'll meet to hand the book over. So it's collected once, here, before
 * they can do anything else.
 */
export async function completeProfile(
  _prev: WelcomeState,
  formData: FormData,
): Promise<WelcomeState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = parseForm(welcomeSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await updateUser(user.id, {
      school: parsed.data.school,
      class_name: parsed.data.className,
    });
  } catch {
    return { error: "Couldn't save that — please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/browse");
}
