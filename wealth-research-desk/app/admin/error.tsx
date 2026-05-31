"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl2 border border-border bg-card p-8 text-center">
      <p className="text-base font-semibold">This admin section could not load</p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background"
      >
        Retry
      </button>
    </div>
  );
}
