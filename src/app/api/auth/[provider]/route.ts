import { NextResponse } from "next/server";

import { authorizeUrl, callbackUrl, createState, getProvider, isProviderEnabled } from "@/lib/oauth";

/**
 * Step one of social login: send the student to Google or GitHub.
 *
 * The page they should land on afterwards is carried inside a signed `state`
 * rather than a plain query parameter, so it can't be tampered with into an
 * open redirect.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: id } = await params;
  const provider = getProvider(id);

  if (!provider || !isProviderEnabled(id)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", `${id} sign-in isn't set up yet.`);
    return NextResponse.redirect(url);
  }

  const next = new URL(request.url).searchParams.get("next") ?? "/";
  const redirectUri = callbackUrl(request, id);

  return NextResponse.redirect(authorizeUrl(provider, redirectUri, createState(next)));
}
