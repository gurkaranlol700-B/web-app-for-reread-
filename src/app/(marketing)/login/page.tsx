import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { SocialButtons } from "@/components/auth/social-buttons";
import { enabledProviders } from "@/lib/oauth";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const providers = enabledProviders();
  const target = next ?? "/";

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">
      <span className="mono-label text-brand">Welcome back</span>
      <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Log in to ReRead.</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        Contact sellers, list your own books, and pass knowledge forward.
      </p>

      {/* Errors bounced back from an OAuth callback land here. */}
      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}

      {/* Social first: one tap, no password to invent or forget. Most students
          will never scroll past this. */}
      {providers.length > 0 ? (
        <>
          <div className="mt-8">
            <SocialButtons providers={providers} next={target} />
          </div>

          <div className="my-7 flex items-center gap-4">
            <span className="border-border h-px flex-1 border-t" />
            <span className="mono-label text-muted-foreground">or with email</span>
            <span className="border-border h-px flex-1 border-t" />
          </div>
        </>
      ) : null}

      <LoginForm next={target} compact={providers.length > 0} />

      <p className="text-muted-foreground mt-6 text-sm">
        {"New here? "}
        <Link href="/signup" className="text-brand font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
