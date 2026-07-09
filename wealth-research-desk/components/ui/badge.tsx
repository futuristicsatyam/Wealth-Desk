import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-surface text-muted border-border",
  success: "bg-positive/15 text-positive border-positive/30",
  danger: "bg-negative/15 text-negative border-negative/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  accent: "bg-accent/15 text-accent border-accent/30"
};

const dotColor: Record<Tone, string> = {
  neutral: "bg-muted",
  success: "bg-positive",
  danger: "bg-negative",
  warning: "bg-warning",
  accent: "bg-accent"
};

export function Badge({
  tone = "neutral",
  dot = false,
  live = false,
  className,
  children
}: {
  tone?: Tone;
  /** Show a leading status dot. */
  dot?: boolean;
  /** Animated pulsing dot for live / real-time state (implies `dot`). */
  live?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {(dot || live) && (
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotColor[tone], live && "pulse-dot")} />
      )}
      {children}
    </span>
  );
}
