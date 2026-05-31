/** Shared formatting helpers used across server components. */

export function formatInr(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amountPaise / 100);
}

export function formatInrPrecise(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(amountPaise / 100);
}

export function formatDate(value: Date): string {
  return value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: Date): string {
  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function maskPan(pan?: string | null): string {
  if (!pan || pan.length !== 10) return "Not provided";
  return `${pan.slice(0, 5)}****${pan.slice(9)}`;
}

export function maskAadhaar(aadhaar?: string | null): string {
  if (!aadhaar || aadhaar.length !== 12) return "Not provided";
  return `XXXX XXXX ${aadhaar.slice(-4)}`;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function tradeStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "Active",
    CLOSED: "Closed",
    TARGET1_HIT: "Target 1 hit",
    TARGET2_HIT: "Target 2 hit",
    TARGET3_HIT: "Target 3 hit",
    STOP_LOSS_HIT: "Stop-loss hit"
  };
  return map[status] ?? titleCase(status);
}
