"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** Cross-cutting time-range filter for the analytics dashboard. */
const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
  { key: "all", label: "All time" }
] as const;

export const DEFAULT_RANGE = "30d";

export function AnalyticsFilters({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === DEFAULT_RANGE) next.delete("range");
    else next.set("range", key);
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1",
        pending && "opacity-60"
      )}
      role="group"
      aria-label="Time range"
    >
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => select(r.key)}
          aria-pressed={current === r.key}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            current === r.key
              ? "bg-accent/15 text-accent"
              : "text-muted hover:text-foreground"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
