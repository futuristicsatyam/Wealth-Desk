"use client";

import { useEffect, useRef } from "react";
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  motion
} from "framer-motion";

/**
 * Counts up to `value` when scrolled into view. Renders as tabular monospace so
 * the width never jumps mid-count. Falls back to the final value instantly when
 * reduced motion is preferred.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20, mass: 0.8 });
  const display = useTransform(spring, (latest) =>
    `${prefix}${latest.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}${suffix}`
  );

  useEffect(() => {
    if (reduce) return;
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue, reduce]);

  if (reduce) {
    return (
      <span ref={ref} className={className}>
        {`${prefix}${value.toLocaleString("en-IN", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        })}${suffix}`}
      </span>
    );
  }

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
