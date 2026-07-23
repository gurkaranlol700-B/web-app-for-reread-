import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">
      <span className="mono-label text-brand">Welcome back</span>
      <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Log in to ReRead.</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        Contact sellers, list your own books, and pass knowledge forward.
      </p>

      <LoginForm next={next ?? "/"} />

      <p className="text-muted-foreground mt-6 text-sm">
        {"New here? "}
        <Link href="/signup" className="text-brand font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
