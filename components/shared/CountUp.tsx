"use client";

import { useEffect, useRef, useState } from "react";

// Animates from 0 to `value` on mount. Respects prefers-reduced-motion by
// snapping straight to the final value instead of animating (still via a
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
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      requestAnimationFrame(() => setDisplay(value));
      return;
    }

    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast start, gentle settle, reads as "snappy" not "slow"
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else setDisplay(value);
    }
    requestAnimationFrame(tick);
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
