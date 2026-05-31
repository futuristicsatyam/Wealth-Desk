import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning" | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-surface text-muted border-border",
  success: "bg-positive/15 text-positive border-positive/30",
  danger: "bg-negative/15 text-negative border-negative/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  accent: "bg-accent/15 text-accent border-accent/30"
};

export function Badge({
  tone = "neutral",
  className,
  children
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
