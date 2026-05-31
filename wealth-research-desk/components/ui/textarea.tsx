import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
