import { cn } from "@/lib/utils";

/**
 * Shimmering placeholder for loading states. Reserve the same box the real
 * content will occupy to avoid layout shift (CLS).
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded-lg", className)} {...props} />;
}
