import Link from "next/link";
import { Heart, MessageSquare, Receipt, Sparkles } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import { countUnreadMessages } from "@/lib/chat";
import { countUnread } from "@/lib/notify";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/browse", label: "Explore" },
  { href: "/requests", label: "Requests" },
  { href: "/sell", label: "List a Book" },
];

/**
 * Masthead navbar. Async Server Component: it reads the session cookie on the
 * server, so the logged-in state — including the unread badges — is correct on
 * first paint with no client-side flash.
 */
export async function Navbar() {
  const user = await getCurrentUser();

  const [unreadMessages, unreadNotifications] = user
    ? await Promise.all([countUnreadMessages(user.id), countUnread(user.id)])
    : [0, 0];

  return (
    <header className="border-border bg-background sticky top-0 z-50 w-full border-b">
      <nav
        aria-label="Main"
        className="mx-auto flex h-20 w-full max-w-[90rem] items-center gap-8 px-6 sm:px-10"
      >
        <Link href="/" className="rounded-full focus-visible:ring-3">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {publicLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
          {!user?.isPlus ? (
            <li>
              <Link
                href="/plus"
                className="text-brand hover:text-brand/80 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
              >
                <Sparkles className="size-3.5" />
                Plus
              </Link>
            </li>
          ) : null}
        </ul>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              <IconLink
                href="/messages"
                label="Messages"
                badge={unreadMessages}
                icon={<MessageSquare className="size-4.5" />}
              />
              <IconLink
                href="/wishlist"
                label="Saved books"
                icon={<Heart className="size-4.5" />}
              />
              <IconLink
                href="/orders"
                label="Orders"
                icon={<Receipt className="size-4.5" />}
              />
              <NotificationBell initialUnread={unreadNotifications} />
            </>
          ) : null}

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
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                    user.isPlus
                      ? "bg-brand text-brand-foreground ring-brand/40 ring-2 ring-offset-2 ring-offset-[var(--background)]"
                      : "bg-brand text-brand-foreground",
                  )}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-medium lg:inline">{user.name}</span>
              </Link>
              {/* A plain form posting to a Server Function — logout works even before JS loads. */}
              <form action={logout} className="hidden sm:block">
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

          <MobileNav isLoggedIn={Boolean(user)} isPlus={Boolean(user?.isPlus)} />
        </div>
      </nav>
    </header>
  );
}

function IconLink({
  href,
  label,
  icon,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={badge > 0 ? `${label} (${badge} unread)` : label}
      title={label}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative hidden size-10 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none sm:flex"
    >
      {icon}
      {badge > 0 ? (
        <span className="bg-brand text-brand-foreground absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
