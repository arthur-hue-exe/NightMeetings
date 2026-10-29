"use client";

import { Cookie } from "lucide-react";
import { cn } from "@/lib/utils";

export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("mm:open-consent"))}
      className={cn(
        "inline-flex items-center gap-1.5 text-left text-sm text-ash transition hover:text-fog",
        className,
      )}
    >
      <Cookie className="size-3.5" aria-hidden="true" />
      Preferências de cookies
    </button>
  );
}
