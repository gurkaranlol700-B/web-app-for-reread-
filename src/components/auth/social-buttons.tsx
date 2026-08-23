import type { ProviderId } from "@/lib/oauth";

/**
 * "Continue with…" buttons.
 *
 * Plain links, not buttons with click handlers — the whole flow is a server
 * redirect, so this ships zero JavaScript and works before hydration. On a
 * phone on school wifi that difference is the difference between the button
 * working and the button appearing to do nothing.
 *
 * Only providers that are actually configured are passed in, so there is never
 * a button here that leads to an error page.
 */

const MARKS: Record<ProviderId, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.75H1.71v2.98A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.67a7.2 7.2 0 0 1 0-4.6V7.09H1.71a12 12 0 0 0 0 10.56l3.84-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.2 15.11 0 12 0 7.4 0 3.42 2.64 1.71 6.49l3.84 2.98C6.46 6.77 9 4.75 12 4.75Z"
      />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden focusable="false">
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.2c-3.34.72-4.04-1.42-4.04-1.42-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.09-.73.09-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.53.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .5Z" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden focusable="false">
      <path d="M16.37 12.77c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.79-3.34-1.81-1.42-.15-2.77.84-3.49.84-.72 0-1.83-.82-3.01-.8-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.93 1.16 9.2.77 1.11 1.68 2.35 2.87 2.31 1.15-.05 1.58-.74 2.97-.74 1.39 0 1.78.74 3 .72 1.24-.02 2.02-1.13 2.78-2.24.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.4-.92-2.42-3.66M14.09 5.3c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.68-1.09 1.77-.95 2.81 1.02.08 2.05-.52 2.68-1.28" />
    </svg>
  ),
};

export function SocialButtons({
  providers,
  next,
}: {
  providers: Array<{ id: ProviderId; label: string }>;
  next: string;
}) {
  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <a
          key={provider.id}
          href={`/api/auth/${provider.id}?next=${encodeURIComponent(next)}`}
          className="border-border bg-card hover:border-brand focus-visible:ring-ring flex h-12 w-full items-center justify-center gap-3 rounded-full border text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {MARKS[provider.id]}
          {`Continue with ${provider.label}`}
        </a>
      ))}
    </div>
  );
}
