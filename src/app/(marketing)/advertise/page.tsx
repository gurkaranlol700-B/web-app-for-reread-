import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, Target, Users } from "lucide-react";

import { CampaignForm } from "@/components/ads/campaign-form";
import { getCurrentUser } from "@/lib/auth";
import { getStats } from "@/lib/store";

export const metadata = {
  title: "Advertise on ReRead",
  description:
    "Reach students who are actively spending money on their education, on the day they're spending it.",
};

export default async function AdvertisePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advertise");

  const stats = await getStats();

  const points = [
    {
      icon: Target,
      title: "Intent, not demographics",
      body: "Everyone here is shopping for study material right now. You aren't guessing who might care — they're already looking.",
    },
    {
      icon: Users,
      title: `${stats.activeStudents} students across ${stats.schoolsConnected} schools`,
      body: "Class 11, 12 and entrance-exam aspirants, concentrated by school. Growing every week.",
    },
    {
      icon: Eye,
      title: "Native, not intrusive",
      body: "Your campaign appears as a clean card in the shelf, clearly marked Sponsored. Nobody gets a pop-up.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
      <span className="mono-label text-brand">For businesses</span>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">
        Reach students on the day they&apos;re spending.
      </h1>
      <p className="text-muted-foreground mt-4 max-w-xl leading-relaxed">
        Coaching institutes, bookshops, stationery brands, test-prep apps — the
        people on ReRead are buying study material this week. Put yourself in
        front of them for the price of a couple of textbooks.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {points.map((point) => (
          <div key={point.title} className="border-border bg-card rounded-2xl border p-5">
            <point.icon className="text-brand size-5" />
            <h2 className="mt-3 font-medium">{point.title}</h2>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{point.body}</p>
          </div>
        ))}
      </div>

      <div className="border-border mt-12 border-t pt-10">
        <h2 className="font-serif text-2xl">Create your campaign</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Takes two minutes. Pay by UPI or card, and we review it before it runs.
        </p>
        <CampaignForm />
      </div>

      <p className="text-muted-foreground mt-8 text-sm">
        {"Already running a campaign? "}
        <Link href="/advertise/dashboard" className="text-brand font-medium hover:underline">
          See your results
        </Link>
      </p>
    </div>
  );
}
