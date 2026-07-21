import Link from "next/link";

import { Logo } from "@/components/layout/logo";

const footerSections = [
  {
    title: "Platform",
    links: [
      { href: "/browse", label: "Explore Books" },
      { href: "/sell", label: "List a Book" },
      { href: "/#why", label: "How it Works" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-border border-t">
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Logo size="lg" />
          <p className="text-muted-foreground mt-4 max-w-xs text-[0.95rem] leading-relaxed">
            The premium marketplace for students to pass knowledge forward.
            Save money, reduce waste, and build a sustainable campus.
          </p>
        </div>

        {footerSections.map((section) => (
          <div key={section.title}>
            <h3 className="mono-label text-muted-foreground">{section.title}</h3>
            <ul className="mt-5 space-y-3">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground hover:text-brand text-[0.95rem] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-border border-t">
        <div className="mono-label text-muted-foreground mx-auto flex w-full max-w-[90rem] flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>© {new Date().getFullYear()} ReRead. All rights reserved.</span>
          <span>Built for students, by students.</span>
        </div>
      </div>
    </footer>
  );
}
