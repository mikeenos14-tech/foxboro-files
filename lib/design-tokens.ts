// Foxboro Files brand palette — kept in sync with the CSS variables in app/globals.css.
// This module exists so non-CSS consumers (Recharts, canvas, inline styles) can reference
// the same hex values without re-declaring them.

export const colors = {
  navy: "#0a1f44",
  navyLight: "#16305f",
  red: "#c8102e",
  redDark: "#9c0c24",
  silver: "#a5acaf",
  silverLight: "#e7e9eb",
  background: "#f5f6f8",
  surface: "#ffffff",
  foreground: "#10151f",
  muted: "#5b6472",
  border: "#e2e4e8",
  rank: {
    good: "#1f8a4c",
    mid: "#b8860b",
    bad: "#c8102e",
  },
} as const;

export const chartColors = {
  primary: colors.navy,
  secondary: colors.red,
  tertiary: colors.silver,
  grid: colors.border,
  axisText: colors.muted,
} as const;
