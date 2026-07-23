import Link from "next/link";

import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
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
