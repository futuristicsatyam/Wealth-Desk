import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta
}: {
  label: string;
  value: string;
  hint?: string;
  /** Optional Lucide icon shown top-right in an accent chip. */
  icon?: LucideIcon;
  /** Optional trend indicator, e.g. { value: "+12.4%", direction: "up" }. */
  delta?: { value: string; direction: "up" | "down" };
}) {
  return (
    <Card className="group relative overflow-hidden">
      {/* Accent top hairline that lights up on hover. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-60 transition-opacity group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              delta.direction === "up" ? "text-positive" : "text-negative"
            )}
          >
            {delta.direction === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {delta.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
