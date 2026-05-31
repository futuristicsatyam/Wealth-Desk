"use client";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl2 border border-border bg-card p-8 text-center">
      <p className="text-base font-semibold">This section could not load</p>
      <p className="mt-1 text-sm text-muted">Please retry in a moment.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background"
      >
        Retry
      </button>
    </div>
  );
}
