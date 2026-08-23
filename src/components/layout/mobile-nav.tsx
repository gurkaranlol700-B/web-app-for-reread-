"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Heart,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Sparkles,
  Tag,
  User,
  X,
} from "lucide-react";

/**
 * The phone menu.
 *
 * ReRead is going to be used almost entirely on phones — students photograph a
 * book with the same device they list it from — so the small-screen navigation
 * is a first-class surface, not a hamburger afterthought.
 */
export function MobileNav({ isLoggedIn, isPlus }: { isLoggedIn: boolean; isPlus: boolean }) {
  const pathname = usePathname();
  // The sheet remembers WHICH page it was opened on, so navigating anywhere
  // (including via the back button) closes it as a pure derivation rather
  // than an effect that fires a second render.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  // A sheet that leaves the page scrolling behind it feels broken on iOS.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const links = [
    { href: "/browse", label: "Explore books", icon: BookOpen },
    { href: "/requests", label: "Book requests", icon: Tag },
    { href: "/sell", label: "List a book", icon: Tag },
    ...(isLoggedIn
      ? [
          { href: "/messages", label: "Messages", icon: MessageSquare },
          { href: "/wishlist", label: "Saved books", icon: Heart },
          { href: "/orders", label: "Orders", icon: Receipt },
          { href: "/profile", label: "My profile", icon: User },
        ]
      : []),
    ...(!isPlus ? [{ href: "/plus", label: "ReRead Plus", icon: Sparkles }] : []),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground flex size-10 items-center justify-center rounded-full transition-colors sm:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] sm:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="bg-background border-border absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col border-l p-6">
            <div className="flex items-center justify-between">
              <span className="mono-label text-brand">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-full transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="mt-6 flex-1">
              <ul className="space-y-1">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="hover:bg-accent/40 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors"
                    >
                      <link.icon className="text-brand size-4.5" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {isLoggedIn ? (
              <form action="/api/logout" method="post">
                <button
                  type="submit"
                  className="border-border hover:border-foreground flex h-11 w-full items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors"
                >
                  <LogOut className="size-4" />
                  Log out
                </button>
              </form>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/signup"
                  className="bg-brand text-brand-foreground flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="border-border flex h-11 w-full items-center justify-center rounded-full border text-sm font-semibold"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
