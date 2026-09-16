"use client";

import { useEffect } from "react";

// CSS's prefers-color-scheme block already renders the correct theme with
// zero JS for anyone who hasn't explicitly chosen one (see globals.css).
// This only needs to run when a saved preference *overrides* the system
// setting — e.g. someone in dark-mode OS chose light mode here. That's a
// narrower case than "always set an attribute before paint," so it doesn't
// need a blocking beforeInteractive script; a brief flash only when someone
// has overridden their system theme is an acceptable trade for not fighting
// Next's script injection in the App Router.
export function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("foxboro-beacon-theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  return null;
}
