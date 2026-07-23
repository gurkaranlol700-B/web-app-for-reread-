import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/browse", label: "Explore" },
  { href: "/sell", label: "List a Book" },
];

/**
 * Masthead navbar. A single hairline rule is the only structure — no
 * translucent blur. Async Server Component: it reads the session cookie on
 * the server, so the logged-in state is correct on first paint with no
 * client-side flash. Only <ThemeToggle /> ships JavaScript.
 */
export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-border bg-background sticky top-0 z-50 w-full border-b">
      <nav
        aria-label="Main"
        className="mx-auto flex h-20 w-full max-w-[90rem] items-center gap-8 px-6 sm:px-10"
      >
        <Link href="/" className="rounded-full focus-visible:ring-3">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                title="My profile"
                className="hidden items-center gap-2 rounded-full transition-opacity hover:opacity-80 focus-visible:ring-3 sm:flex"
              >
                <span
                  aria-hidden
                  className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold"
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium">{user.name}</span>
              </Link>
              {/* A plain form posting to a Server Function — logout works even before JS loads. */}
              <form action={logout}>
                <button
                  type="submit"
                  className="border-border hover:border-foreground inline-flex h-10 items-center rounded-full border px-5 text-sm font-semibold transition-colors"
                >
                  Log out
                </button>
              </form>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground hidden px-3 py-2 text-sm font-medium transition-colors sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={cn(
                  "bg-brand text-brand-foreground inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold",
                  "transition-opacity hover:opacity-90",
                )}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
