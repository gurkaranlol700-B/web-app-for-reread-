import type { Metadata } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";

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

export const metadata: Metadata = {
  title: {
    default: "ReRead — Pass knowledge forward",
    template: "%s · ReRead",
  },
  description:
    "ReRead is the premium marketplace for school textbooks. Save money, reduce waste, and connect with students in your community.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
