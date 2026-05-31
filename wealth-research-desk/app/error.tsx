"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="container-page flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Something went wrong</p>
      <h1 className="mt-3 text-2xl font-semibold">We hit an unexpected error</h1>
      <p className="mt-2 text-sm text-muted">Please retry, or return to the homepage.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background">
          Try again
        </button>
        <Link href="/" className="rounded-lg border border-border px-5 py-2.5 text-sm">
          Go home
        </Link>
      </div>
    </main>
  );
}
