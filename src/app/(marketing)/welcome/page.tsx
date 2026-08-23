import { redirect } from "next/navigation";

import { WelcomeForm } from "@/components/auth/welcome-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "One last thing" };
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Already finished — no reason to make them look at this twice.
  if (user.school) redirect("/browse");

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 sm:py-24">
      <span className="mono-label text-brand">Almost there</span>
      <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">
        {`Welcome, ${user.name.split(" ")[0]}.`}
      </h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        One question and you&apos;re done. ReRead is organised by school — it&apos;s
        how we show you books you can actually collect, from people you can
        actually meet.
      </p>

      <WelcomeForm />
    </div>
  );
}
