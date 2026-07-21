import type { Condition } from "@/data/books";
import { cn } from "@/lib/utils";

const CONDITION_STYLES: Record<Condition, string> = {
  New: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Like New": "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  Good: "bg-brand/15 text-amber-700 dark:text-brand",
  Fair: "bg-muted text-muted-foreground",
};

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        CONDITION_STYLES[condition],
      )}
    >
      {condition}
    </span>
  );
}
