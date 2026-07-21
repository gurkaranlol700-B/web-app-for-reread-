import { cn } from "@/lib/utils";

/**
 * The ReRead wordmark, set in the display serif so it reads as a masthead
 * rather than a UI label. "Re" carries the one saturated colour in the whole
 * product (--brand); "Read" sits in ink/paper foreground. Both are theme
 * tokens, so dark mode is free.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <span
      className={cn(
        "font-serif font-medium tracking-tight select-none",
        sizes[size],
        className,
      )}
    >
      <span aria-hidden className="text-brand italic">
        Re
      </span>
      <span aria-hidden className="text-foreground">
        Read
      </span>
      <span className="sr-only">ReRead</span>
    </span>
  );
}
