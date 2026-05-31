import { Card } from "@/components/ui/card";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}
