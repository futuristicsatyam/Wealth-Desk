import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "warning" | "info";

const tones: Record<Tone, string> = {
  success: "border-positive/30 bg-positive/10 text-positive",
  error: "border-negative/30 bg-negative/10 text-negative",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-accent/30 bg-accent/10 text-accent"
};

/** Server-rendered banner for query-param feedback (e.g. ?status=saved). */
export function PageBanner({ tone, message }: { tone: Tone; message: string }) {
  return (
    <div className={cn("mb-4 rounded-lg border px-4 py-2.5 text-sm", tones[tone])}>
      {message}
    </div>
  );
}
