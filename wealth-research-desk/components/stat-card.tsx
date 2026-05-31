import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="space-y-1">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}
