"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { addRequest, closeRequest, respondToRequest } from "@/lib/requests";
import { bookRequestSchema, parseForm } from "@/lib/validation";

export type RequestState = { error?: string; done?: boolean };

export async function postRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to post a request." };

  const parsed = parseForm(bookRequestSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await addRequest(user.id, {
      title: parsed.data.title,
      subject: parsed.data.subject,
      className: parsed.data.className,
      maxPrice: Math.round(parsed.data.maxPrice),
      note: parsed.data.note,
    });
  } catch {
    return { error: "Couldn't post that — please try again." };
  }

  revalidatePath("/requests");
  return { done: true };
}

/** "I have this book" — tells the requester and sends the seller off to list it. */
export async function offerBook(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/requests");

  await respondToRequest({
    requestId: String(formData.get("requestId") ?? ""),
    responderId: user.id,
    responderName: user.name,
  });

  revalidatePath("/requests");
  redirect("/sell");
}

export async function retireRequest(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await closeRequest(user.id, String(formData.get("requestId") ?? ""));
  revalidatePath("/requests");
}
