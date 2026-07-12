"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type LiveNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

const POPUP_LIFETIME_MS = 7000;
// Polling cadence. A stateless poll against an indexed query scales linearly and
// works across every serverless instance — unlike a long-lived SSE connection,
// which pins one function invocation per active user and can't fan out across
// instances. Base 15s keeps steady-state load low at high concurrency; on any
// failure we back off to 60s instead of hammering the DB pool.
const POLL_BASE_MS = 15000;
const POLL_MAX_MS = 60000;

export function LiveNotifications() {
  const router = useRouter();
  const [popups, setPopups] = useState<LiveNotification[]>([]);
  const pollTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const lastSeenRef = useRef<string>(new Date().toISOString());
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;

    // Coalesce bursts of notifications into at most one server refresh per second.
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        if (alive) router.refresh();
      }, 1000);
    };

    const playSound = () => {
      if (typeof window === "undefined") return;
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      try {
        const context = new AudioCtx();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.24);

        setTimeout(() => void context.close(), 400);
      } catch {
        // Ignore sound failures (autoplay policies / unsupported audio context).
      }
    };

    const scheduleRemoval = (id: string) => {
      window.setTimeout(() => {
        if (!alive) return;
        setPopups((current) => current.filter((item) => item.id !== id));
      }, POPUP_LIFETIME_MS);
    };

    const pushPopup = (notification: LiveNotification) => {
      if (seenIdsRef.current.has(notification.id)) return;
      seenIdsRef.current.add(notification.id);
      if (notification.createdAt > lastSeenRef.current) {
        lastSeenRef.current = notification.createdAt;
      }

      setPopups((current) => {
        if (current.some((item) => item.id === notification.id)) return current;
        scheduleRemoval(notification.id);
        return [notification, ...current].slice(0, 4);
      });
      playSound();
      scheduleRefresh();
    };

    let pollDelay = POLL_BASE_MS;

    // Self-scheduling poll with exponential backoff. On any failure (API/DB slow
    // or down) the interval doubles up to POLL_MAX_MS instead of hammering the
    // server; a success resets it to the base interval.
    const runPoll = async () => {
      if (!alive) return;
      let ok = false;
      try {
        const response = await fetch(
          `/api/notifications/live?after=${encodeURIComponent(lastSeenRef.current)}`,
          { method: "GET", cache: "no-store", credentials: "same-origin" }
        );
        if (response.ok) {
          ok = true;
          const payload = (await response.json()) as { notifications?: LiveNotification[] };
          for (const notification of payload.notifications ?? []) {
            pushPopup(notification);
          }
        }
      } catch {
        // Treated as a failure below -> back off.
      }

      pollDelay = ok ? POLL_BASE_MS : Math.min(POLL_MAX_MS, pollDelay * 2);
      if (alive) pollTimerRef.current = window.setTimeout(runPoll, pollDelay);
    };

    pollTimerRef.current = window.setTimeout(runPoll, pollDelay);

    return () => {
      alive = false;
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [router]);

  if (popups.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-[min(92vw,24rem)] flex-col gap-2">
      {popups.map((popup) => (
        <div
          key={popup.id}
          className={cn(
            "pointer-events-auto rounded-lg border border-accent/30 bg-card/95 p-3 shadow-xl backdrop-blur",
            "animate-in slide-in-from-top-2 duration-300"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{popup.title}</p>
            <button
              type="button"
              onClick={() => setPopups((current) => current.filter((item) => item.id !== popup.id))}
              className="rounded p-0.5 text-muted hover:bg-surface hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">{popup.body}</p>
        </div>
      ))}
    </div>
  );
}
