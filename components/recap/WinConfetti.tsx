"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

// One tasteful burst on mount for a win, nothing on a loss — celebrate the
// moment without being obnoxious about it. Re-fires only if the game (won)
// actually changes, not on every re-render.
export function WinConfetti({ won }: { won: boolean }) {
  useEffect(() => {
    if (!won) return;

    const colors = ["#0a1f44", "#c8102e", "#e7e9eb"];
    const duration = 1600;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.7 },
        colors,
        scalar: 0.9,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.7 },
        colors,
        scalar: 0.9,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [won]);

  return null;
}
