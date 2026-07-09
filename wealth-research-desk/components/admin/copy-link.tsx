"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Small copy-to-clipboard control for private plan access links. */
export function CopyLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard may be blocked; fall back to selecting nothing — the input
      // below is still readable/selectable by the admin.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        aria-label="Shareable access link"
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-muted"
      />
      <Button type="button" size="sm" variant="secondary" onClick={copy}>
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}
