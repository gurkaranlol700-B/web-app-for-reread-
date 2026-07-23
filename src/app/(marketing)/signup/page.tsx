import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Cloud demo: new accounts can't persist reliably on Vercel's rotating
  // read-only servers (a signup could "vanish" minutes later). Gated until
  // the database milestone; the demo login account works everywhere.
  if (process.env.VERCEL) {
    return <ComingSoon feature="Public sign-ups" version="2" />;
  }

  const { next } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">
      <span className="mono-label text-brand">Join the movement</span>
      <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Create your account.</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        Takes less than a minute — then you can list books and reach sellers at
        your school.
      </p>

      <SignupForm next={next ?? "/"} />

      <p className="text-muted-foreground mt-6 text-sm">
        {"Already have an account? "}
        <Link href="/login" className="text-brand font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
