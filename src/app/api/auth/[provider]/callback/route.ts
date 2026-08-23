import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import {
  callbackUrl,
  exchangeCodeForToken,
  getProvider,
  isProviderEnabled,
  readState,
} from "@/lib/oauth";
import { NO_PASSWORD } from "@/lib/password";
import { createUser, findUserByEmail, updateUser } from "@/lib/store";

/**
 * Step two of social login: the provider sends the student back here.
 *
 * What happens, in order, and why:
 *
 *  1. `state` is verified first. A callback we didn't initiate is dropped
 *     before anything else happens — that is the login-CSRF defence.
 *  2. The code is exchanged for a token SERVER-SIDE, so the client secret
 *     never touches the browser.
 *  3. The email must come back verified. An unverified address would let
 *     someone claim an account that isn't theirs simply by typing it into a
 *     provider that doesn't check.
 *  4. Accounts are matched BY EMAIL. Sign up with a password, later use
 *     "Continue with Google" on the same address, and you land in the same
 *     account rather than a confusing duplicate.
 */
function fail(request: Request, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: id } = await params;
  const provider = getProvider(id);
  if (!provider || !isProviderEnabled(id)) {
    return fail(request, "That sign-in method isn't available.");
  }

  const query = new URL(request.url).searchParams;

  // The student pressed "Cancel" on the provider's consent screen.
  if (query.get("error")) {
    return fail(request, "Sign-in was cancelled.");
  }

  const state = readState(query.get("state") ?? "");
  if (!state) return fail(request, "That sign-in link expired. Please try again.");

  const code = query.get("code");
  if (!code) return fail(request, "Sign-in didn't complete. Please try again.");

  const token = await exchangeCodeForToken(provider, code, callbackUrl(request, id));
  if (!token) return fail(request, `Couldn't reach ${provider.label}. Please try again.`);

  const profile = await provider.fetchProfile(token);
  if (!profile) return fail(request, `Couldn't read your ${provider.label} profile.`);
  if (!profile.emailVerified) {
    return fail(
      request,
      `Your ${provider.label} email isn't verified. Verify it there first, or use email and password.`,
    );
  }

  try {
    const existing = await findUserByEmail(profile.email);

    if (existing) {
      // Keep the avatar fresh, but never overwrite a school the student typed
      // in themselves with something a provider guessed.
      if (profile.avatarUrl && profile.avatarUrl !== existing.avatarUrl) {
        await updateUser(existing.id, { avatar_url: profile.avatarUrl });
      }
      await createSession(existing);

      // A brand-new social account has no school yet, and school is what makes
      // ReRead work — send them to finish it before anything else.
      return NextResponse.redirect(
        new URL(existing.school ? state.next : "/welcome", request.url),
      );
    }

    const created = await createUser({
      name: profile.name,
      email: profile.email,
      school: "",
      passwordHash: NO_PASSWORD,
    });

    if (profile.avatarUrl) {
      await updateUser(created.id, { avatar_url: profile.avatarUrl });
    }

    await notify({
      userId: created.id,
      kind: "system",
      title: "Welcome to ReRead",
      body: "Tell us your school and you're ready to buy and sell.",
      link: "/welcome",
    });

    await createSession(created);
    return NextResponse.redirect(new URL("/welcome", request.url));
  } catch {
    return fail(request, "Couldn't finish signing you in. Please try again.");
  }
}
