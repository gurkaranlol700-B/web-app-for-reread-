import { redirect } from "next/navigation";

import { SellForm } from "@/components/marketplace/sell-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "List a Book" };

export default async function SellPage() {
  const user = await getCurrentUser();
  // Selling needs an account — bounce to login and come straight back after.
  if (!user) redirect("/login?next=/sell");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">Sell</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">
        Give your book a second life.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-lg leading-relaxed">
        {`Listing as ${user.name} · ${user.school}. Fill in the details below — your book goes live on the shelf the moment you submit.`}
      </p>

      <SellForm />
    </div>
  );
}
