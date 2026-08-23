"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

import type { Notification } from "@/lib/notify";

/**
 * The notification bell.
 *
 * The unread count arrives from the server on first paint, so the badge is
 * right immediately. The list itself is only fetched when the bell is opened —
 * there is no reason to ship every user's notification history on every page
 * load just in case they click.
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Notification[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Opening the panel zeroes the badge locally, but a fresh count from a new
  // server render must win. Adjusting state during render is React's own
  // recommended pattern for this, and it avoids the extra render an effect
  // would cost.
  const [lastServerCount, setLastServerCount] = useState(initialUnread);
  if (lastServerCount !== initialUnread) {
    setLastServerCount(initialUnread);
    setUnread(initialUnread);
  }

  // Click-outside and Escape both close it — a dropdown you can't dismiss is
  // worse than no dropdown.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;

    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { notifications?: Notification[] };
      setItems(data.notifications ?? []);
      // Opening the panel is the read receipt.
      setUnread(0);
    } catch {
      setItems([]);
    }
  }

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative flex size-10 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Bell className="size-4.5" />
        {unread > 0 ? (
          <span className="bg-brand text-brand-foreground absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="border-border bg-card absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border p-2 shadow-xl">
          {items === null ? (
            <p className="text-muted-foreground p-4 text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">
              Nothing yet. Sell a book or save one and this fills up.
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.link}
                    onClick={() => setOpen(false)}
                    className={`hover:bg-accent/40 block rounded-xl p-3 transition-colors ${
                      item.readAt ? "" : "bg-accent/20"
                    }`}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.body ? (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
                        {item.body}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
