import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

/**
 * Playfair Display carries every headline -- matches the reference build's
 * heading font exactly. Inter carries everything else — body copy, nav,
 * buttons, form labels (also matches the reference). JetBrains Mono is used
 * sparingly for small editorial labels. All three self-hosted via next/font.
 */
const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Used for absolute URLs in OG tags and the sitemap. */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://web-app-for-reread.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ReRead — Pass knowledge forward",
    template: "%s · ReRead",
  },
  description:
    "ReRead is the marketplace for school textbooks. Buy and sell with students at your own school, save up to 85%, and keep good books out of the bin.",
  applicationName: "ReRead",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ReRead",
    // The forest-green status bar continues the app's own surface instead of
    // leaving a white strip above it on iPhone.
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "ReRead",
    title: "ReRead — Pass knowledge forward",
    description:
      "Buy and sell school textbooks with students at your own school. Save money, cut waste.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReRead — Pass knowledge forward",
    description: "The marketplace for school textbooks.",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2A1E" },
  ],
  // `viewportFit: cover` lets the app paint under an iPhone's notch, which is
  // what makes an installed PWA stop looking like a website.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required by next-themes: it sets the theme
    // class on <html> before React hydrates, so the server HTML and the first
    // client render intentionally differ on this one element.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfairDisplay.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
