import { cn } from "@/lib/utils";

type CardVariant = "default" | "glass" | "gradient" | "elevated";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  /** Adds hover lift + accent border. Use for clickable / linked cards. */
  interactive?: boolean;
};

const variants: Record<CardVariant, string> = {
  default: "border border-border bg-card shadow-card",
  elevated: "border border-border-strong bg-elevated shadow-premium",
  glass: "glass shadow-card",
  gradient: "gradient-border shadow-card"
};

export function Card({ className, variant = "default", interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl2 p-5",
        variants[variant],
        interactive &&
          "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-glow-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-base font-semibold text-foreground", className)} {...props} />;
}
