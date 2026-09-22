"use client";

import { useEffect, useRef, useState } from "react";

// Animates from 0 to `value` on mount, and from whatever it was showing
// to the new `value` on every later change (e.g. swapping a stat window)
// — not just once, ever. Respects prefers-reduced-motion by snapping
// straight to the final value instead of animating (still via a
// rAF-deferred update, not a direct setState-in-effect call, so this stays
// an external-system synchronization rather than a render-loop hazard).
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 900,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prevValueRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevValueRef.current ?? 0;
    prevValueRef.current = value;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      requestAnimationFrame(() => setDisplay(value));
      return;
    }

    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast start, gentle settle, reads as "snappy" not "slow"
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = display.toFixed(decimals);
  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
