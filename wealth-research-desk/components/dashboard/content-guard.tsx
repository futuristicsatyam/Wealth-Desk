"use client";

import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";

/**
 * Wraps sensitive content (e.g. live trades) with anti-leak protections.
 *
 * IMPORTANT: a web page cannot truly prevent an OS-level screenshot — no
 * browser API exists for that. This component applies the practical mitigations
 * that real platforms use:
 *   1. Blocks text selection, copy/cut, drag and the right-click menu.
 *   2. Masks the content when the tab/window loses focus, which defeats most
 *      snipping tools and screen recorders that steal focus.
 *   3. Warns on PrintScreen / capture shortcuts and clears the clipboard.
 *   4. Overlays a per-user watermark so any screenshot is traceable.
 */
export function ContentGuard({ watermark, children }: { watermark: string; children: ReactNode }) {
  const [inactive, setInactive] = useState(false);
  const [warn, setWarn] = useState(false);
  // Computed client-side (avoids SSR hydration mismatch) and refreshed each
  // minute so any capture carries a near-current timestamp.
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    const tick = () =>
      setStamp(
        new Date().toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short"
        })
      );
    tick();
    const stampTimer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(stampTimer);
  }, []);

  useEffect(() => {
    let warnTimer: number | undefined;

    function flagCapture() {
      // Best-effort: clear anything the capture may have placed on the clipboard.
      navigator.clipboard?.writeText("").catch(() => {});
      setWarn(true);
      window.clearTimeout(warnTimer);
      warnTimer = window.setTimeout(() => setWarn(false), 2600);
    }

    function onKey(e: KeyboardEvent) {
      const mac = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key); // macOS capture
      if (e.key === "PrintScreen" || mac) flagCapture();
    }
    function onVisibility() {
      setInactive(document.visibilityState === "hidden");
    }
    const onBlur = () => setInactive(true);
    const onFocus = () => setInactive(false);

    window.addEventListener("keyup", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(warnTimer);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const block = (e: SyntheticEvent) => e.preventDefault();

  return (
    <div
      className="relative select-none"
      onCopy={block}
      onCut={block}
      onContextMenu={block}
      onDragStart={block}
    >
      {children}

      {/* Per-user watermark — repeated diagonally so any screenshot is traceable
          to this account and time. Visible enough to survive a capture without
          making the trades unreadable. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 flex flex-wrap content-center justify-center gap-x-20 gap-y-16 overflow-hidden rotate-[-24deg] scale-125 text-accent opacity-[0.10]"
      >
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            key={i}
            className="whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-widest text-accent"
          >
            {watermark} · {stamp} · CONFIDENTIAL
          </span>
        ))}
      </div>

      {/* Blur the content whenever the window is inactive (capture deterrent). */}
      {inactive && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl2 bg-background/70 text-center backdrop-blur-xl">
          <p className="max-w-xs text-sm text-muted">
            Content hidden while this window is inactive.
          </p>
        </div>
      )}

      {/* Transient warning on a detected capture shortcut. */}
      {warn && (
        <div
          role="alert"
          className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[92%] rounded-lg border border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm font-medium text-warning shadow-premium"
        >
          Screenshots are discouraged — this screen is watermarked to your account.
        </div>
      )}
    </div>
  );
}
