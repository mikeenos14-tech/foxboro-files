import type { KeyboardEvent } from "react";

// Left/right arrow (and Home/End) between the buttons of a role="tablist",
// the way keyboard users expect tabs to work. Returns the index to select,
// or null when the key wasn't one of those. Focus moves with the selection.
export function tabKeyTarget(e: KeyboardEvent<HTMLElement>, active: number, count: number): number | null {
  const next =
    e.key === "ArrowRight" ? (active + 1) % count
    : e.key === "ArrowLeft" ? (active - 1 + count) % count
    : e.key === "Home" ? 0
    : e.key === "End" ? count - 1
    : null;
  if (next === null) return null;
  e.preventDefault();
  const tabs = e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
  tabs[next]?.focus();
  return next;
}
