import Link from "next/link";
import { Apple, Share, Smartphone, Wifi } from "lucide-react";
import QRCode from "qrcode";

import { getStats } from "@/lib/store";

export const metadata = {
  title: "Get the app",
  description: "Install ReRead on your phone. Scan, tap, done — no app store needed.",
};

/**
 * The page a judge lands on after scanning the QR code on your slide.
 *
 * It has one job: get ReRead onto their phone in under ten seconds, without an
 * app store, an account, or a download. The QR is rendered server-side as an
 * inline SVG so it needs no image request and stays razor sharp on a projector.
 */
export default async function GetPage() {
  const stats = await getStats();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://web-app-for-reread.vercel.app";

  // Rendered as a path-based SVG, coloured to the brand rather than pure black
  // so it sits properly on a dark slide.
  const qr = await QRCode.toString(site, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0d2b1d", light: "#f5efe1" },
  });

  const steps = [
    {
      icon: Smartphone,
      title: "Android · Chrome",
      body: "A bar appears saying “Add ReRead to your phone”. Tap Install. That's it.",
    },
    {
      icon: Apple,
      title: "iPhone · Safari",
      body: "Tap the Share button, scroll down, then Add to Home Screen.",
    },
    {
      icon: Wifi,
      title: "Works on bad wifi",
      body: "Once installed it opens fullscreen with no address bar, and the shelf still loads when the signal drops.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
      <div className="text-center">
        <span className="mono-label text-brand">Install</span>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02]">
          ReRead, on your phone.
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-lg leading-relaxed">
          Point your camera at the code. It installs like an app — real icon,
          fullscreen, no app store, nothing to download.
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <div className="rounded-3xl bg-[#f5efe1] p-5 shadow-xl">
          {/* Server-rendered SVG: no network request, and it stays sharp when
              a projector scales it up. */}
          <div
            className="size-56 sm:size-64 [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qr }}
            role="img"
            aria-label={`QR code linking to ${site}`}
          />
        </div>
      </div>

      <p className="text-muted-foreground mt-5 text-center text-sm">
        Or type it in:{" "}
        <span className="text-foreground font-medium">{site.replace(/^https?:\/\//, "")}</span>
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.title} className="border-border bg-card rounded-2xl border p-5">
            <div className="bg-accent/40 flex size-10 items-center justify-center rounded-xl">
              <step.icon className="text-brand size-4.5" />
            </div>
            <h2 className="mt-3 font-medium">{step.title}</h2>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="border-border bg-card mt-10 rounded-2xl border p-6 text-center">
        <p className="font-serif text-xl italic">
          {`${stats.booksListed} books from ${stats.schoolsConnected} schools are on the shelf right now.`}
        </p>
        <Link
          href="/browse"
          className="bg-brand text-brand-foreground mt-5 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          Have a look first
        </Link>
      </div>

      <p className="text-muted-foreground mt-8 flex items-center justify-center gap-1.5 text-center text-xs">
        <Share className="size-3.5" />
        On iPhone the Share button is at the bottom of Safari, not in the menu.
      </p>
    </div>
  );
}
