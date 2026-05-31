import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-accent text-background hover:opacity-90",
  secondary: "border border-border bg-surface text-foreground hover:bg-card",
  ghost: "text-muted hover:bg-surface hover:text-foreground",
  danger: "bg-negative text-white hover:opacity-90"
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
