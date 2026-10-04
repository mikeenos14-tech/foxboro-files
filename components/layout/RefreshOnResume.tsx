"use client";

import { useEffect } from "react";

// A home-screen web app on iOS reopens exactly where it was left, showing
// the page as it was hours or days ago, and nothing reloads it. The same
// happens to a tab left open in a browser. When the page comes back into
// view after being hidden for a while, reload it so the numbers are the
// current ones; nothing happens while someone is actively reading.
const RELOAD_AFTER_MS = 15 * 60 * 1000;

export function RefreshOnResume() {
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt > RELOAD_AFTER_MS) window.location.reload();
      hiddenAt = null;
    };
    // Safari's back-forward cache restores a page without re-running it.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
