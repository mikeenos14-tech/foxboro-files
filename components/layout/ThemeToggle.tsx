"use client";

// No React state here on purpose: the active theme lives on the DOM
// (data-theme, read by CSS/Tailwind's dark: variant — see globals.css),
// and both icons are always rendered with CSS deciding which one shows.
// That avoids any server/client hydration mismatch a stateful "current
// theme" read would otherwise risk.
export function ThemeToggle() {
  function toggle() {
    const explicit = document.documentElement.getAttribute("data-theme");
    // No explicit override yet doesn't mean "light" — most visitors are
    // relying on their system preference, which might already be dark.
    // Flip from the *effective* theme, not just the raw attribute, so one
    // click always does something instead of the first click merely
    // pinning whatever was already showing.
    const effective =
      explicit ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = effective === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("route1rewind-theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-navy-light hover:text-white"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="dark:hidden"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="hidden dark:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
