import { NextResponse } from "next/server";

import { trackAdEvent } from "@/lib/monetize";

/**
 * Click-through for a sponsored card: count it, then forward.
 *
 * Counting server-side rather than with a browser pixel means the numbers on
 * an advertiser's dashboard are real even for people running ad blockers —
 * which, for an audience of teenagers, is most of them.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ad = await trackAdEvent(id, "click");

  // A dead or deleted campaign sends the visitor to the shelf rather than an
  // error page — they clicked expecting to go somewhere.
  if (!ad) return NextResponse.redirect(new URL("/browse", request.url));

  // Only ever forward to http(s) — a stored `javascript:` target would be an
  // open redirect straight into the browser's script context.
  let destination: URL;
  try {
    destination = new URL(ad.targetUrl);
    if (destination.protocol !== "https:" && destination.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    return NextResponse.json({ error: "invalid destination" }, { status: 400 });
  }

  return NextResponse.redirect(destination, { status: 302 });
}
