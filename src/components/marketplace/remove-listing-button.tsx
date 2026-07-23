"use client";

import { Trash2 } from "lucide-react";

import { deleteListing } from "@/app/actions/listing";

/**
 * Profile-only "take my book down" control. Asks for confirmation before
 * submitting; the server re-verifies ownership either way.
 */
export function RemoveListingButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteListing}
      onSubmit={(e) => {
        if (!window.confirm(`Remove "${title}" from the marketplace?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="border-border text-muted-foreground inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border text-xs font-semibold transition-colors hover:border-red-400 hover:text-red-500"
      >
        <Trash2 className="size-3.5" />
        Remove listing
      </button>
    </form>
  );
}
