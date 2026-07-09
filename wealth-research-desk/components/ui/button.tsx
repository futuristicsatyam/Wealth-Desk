import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  // Cyan gradient CTA with a soft glow that intensifies on hover.
  primary:
    "bg-gradient-to-b from-accent to-accent-strong text-background font-semibold " +
    "shadow-[0_6px_20px_-8px_rgb(var(--accent)/0.6)] hover:shadow-[0_10px_32px_-8px_rgb(var(--accent)/0.75)] " +
    "hover:-translate-y-px",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-elevated hover:border-border-strong",
  outline:
    "border border-accent/40 bg-accent/5 text-accent hover:bg-accent/10 hover:border-accent/70",
  ghost: "text-muted hover:bg-surface hover:text-foreground",
  danger: "bg-negative text-white hover:opacity-90 shadow-[0_6px_20px_-8px_rgb(var(--negative)/0.6)]"
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg cursor-pointer select-none",
        "transition-all duration-200 ease-out active:scale-[0.98] active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
