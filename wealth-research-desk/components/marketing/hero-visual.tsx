"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform
} from "framer-motion";
import { ArrowUpRight, TrendingUp } from "lucide-react";

/**
 * 3D-tilted fintech dashboard illustration for the marketing hero.
 * Pure SVG + CSS transforms (no external assets → CSP-safe).
 *
 * Depth (perspective + tilt) is a desktop-only enhancement driven by the
 * pointer; on touch / small screens the composition renders flat and centred,
 * so the floating chips never scale or drift over the panel. Reduced-motion
 * disables the idle float and entrance animations.
 */
export function HeroVisual() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [-7, 7]), { stiffness: 120, damping: 18 });

  function onMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[520px] lg:[perspective:1200px]"
      aria-hidden
    >
      {/* Gradient orbs */}
      <div className="orb absolute -left-6 top-8 h-44 w-44 bg-accent sm:h-56 sm:w-56" />
      <div className="orb absolute bottom-4 right-0 h-40 w-40 bg-accent-strong sm:h-52 sm:w-52" />

      <motion.div
        className="relative h-full w-full"
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {/* Main dashboard panel — centred via flex so no transform conflict */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-[86%] max-w-[380px] rounded-2xl border border-border-strong/70 bg-card/90 p-5 shadow-premium backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <TrendingUp size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">NIFTY 50</p>
                  <p className="text-[10px] text-muted">Index derivatives</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-foreground">24,318.60</p>
                <p className="flex items-center justify-end gap-0.5 text-[11px] font-medium text-positive">
                  <ArrowUpRight size={12} /> +1.24%
                </p>
              </div>
            </div>

            {/* Area chart */}
            <div className="mt-4">
              <AreaChart />
            </div>

            {/* Mini stat row */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Win rate", "72%"],
                ["Avg R:R", "1:2.4"],
                ["Live", "24"]
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border bg-surface/70 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted">{k}</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{v}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Floating trade-signal chip (top-left) */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="float absolute left-0 top-2 w-36 sm:top-4 sm:w-40"
        >
          <div className="rounded-xl border border-border-strong/70 bg-elevated/95 p-3 shadow-premium backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-positive/15 px-1.5 py-0.5 text-[10px] font-bold text-positive">
                BUY
              </span>
              <span className="text-[10px] text-muted">2m ago</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-foreground">BANKNIFTY</p>
            <p className="text-[11px] text-muted">Entry 52,140 · SL 51,900</p>
          </div>
        </motion.div>

        {/* Floating "target hit" pill (bottom-right) */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="float-slow absolute bottom-6 right-0"
        >
          <div className="flex items-center gap-2 rounded-full border border-positive/30 bg-positive/10 px-3 py-2 shadow-premium backdrop-blur">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-positive/20 text-positive">
              <ArrowUpRight size={14} />
            </span>
            <span className="text-xs font-semibold text-positive">Target 1 hit · +2.4%</span>
          </div>
        </motion.div>

        {/* Floating token coin */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="float absolute right-6 top-0 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-strong text-lg font-bold text-white shadow-glow-accent sm:right-10 sm:h-12 sm:w-12"
        >
          ₹
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Self-contained gradient area chart. */
function AreaChart() {
  const line =
    "M0,58 C18,52 26,40 42,42 C58,44 66,30 84,30 C102,30 110,20 128,22 C146,24 156,12 174,10 C190,8 198,16 210,14";
  return (
    <svg viewBox="0 0 210 72" className="h-24 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(var(--accent))" />
          <stop offset="100%" stopColor="rgb(var(--accent-strong))" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[18, 36, 54].map((y) => (
        <line key={y} x1="0" y1={y} x2="210" y2={y} stroke="rgb(var(--border))" strokeWidth="0.5" />
      ))}
      <path d={`${line} L210,72 L0,72 Z`} fill="url(#hero-area)" />
      <path d={line} fill="none" stroke="url(#hero-line)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
