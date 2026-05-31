import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";
