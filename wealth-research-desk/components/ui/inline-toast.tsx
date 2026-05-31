import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";

const tones: Record<Tone, string> = {
  success: "border-positive/30 bg-positive/10 text-positive",
  error: "border-negative/30 bg-negative/10 text-negative",
  info: "border-accent/30 bg-accent/10 text-accent"
};

export function InlineToast({ tone, message }: { tone: Tone; message: string }) {
  return (
    <div
      role="status"
      className={cn("rounded-lg border px-3 py-2 text-xs font-medium", tones[tone])}
    >
      {message}
    </div>
  );
}
