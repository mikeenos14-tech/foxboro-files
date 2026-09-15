// Foxboro Files brand palette. The actual color VALUES live as CSS custom
// properties in app/globals.css (light + dark), which is what lets the
// whole site re-theme instantly. Chart components reference the CSS
// variables directly (e.g. "var(--color-navy)") so charts follow the
// active theme automatically instead of being frozen to light-mode hex.

export const chartColors = {
  primary: "var(--color-navy)",
  secondary: "var(--color-red)",
  tertiary: "var(--color-silver)",
  grid: "var(--color-border)",
  axisText: "var(--color-muted)",
} as const;
