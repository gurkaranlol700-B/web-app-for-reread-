import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { SocialButtons } from "@/components/auth/social-buttons";
import { enabledProviders } from "@/lib/oauth";

export const metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; ref?: string; error?: string }>;
}) {
  const { next, ref, error } = await searchParams;
  const providers = enabledProviders();
  const target = next ?? "/";

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">
      <span className="mono-label text-brand">Join the movement</span>
      <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Create your account.</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        Takes less than a minute — then you can list books and reach sellers at
        your school.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}

      {providers.length > 0 ? (
        <>
          <div className="mt-8">
            <SocialButtons providers={providers} next={target} />
          </div>
          <p className="text-muted-foreground/70 mt-3 text-center text-xs">
            Fastest way in — no password to invent.
          </p>

          <div className="my-7 flex items-center gap-4">
            <span className="border-border h-px flex-1 border-t" />
            <span className="mono-label text-muted-foreground">or with email</span>
            <span className="border-border h-px flex-1 border-t" />
          </div>
        </>
      ) : null}

      <SignupForm next={target} referralCode={ref ?? ""} compact={providers.length > 0} />

      <p className="text-muted-foreground mt-6 text-sm">
        {"Already have an account? "}
        <Link href="/login" className="text-brand font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
