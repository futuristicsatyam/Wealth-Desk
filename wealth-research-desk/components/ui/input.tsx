import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground",
        "placeholder:text-muted focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-accent disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
