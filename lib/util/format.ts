export function formatDate(iso: string): string {
  // Date-only ISO strings ("2026-09-21") parse as UTC midnight; formatting
  // in a timezone behind UTC would otherwise roll the date back a day.
  // Anchoring to noon UTC keeps the calendar date stable everywhere.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T12:00:00Z`)
    : new Date(iso);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signed(value: number, digits = 2): string {
  const s = value.toFixed(digits);
  return value > 0 ? `+${s}` : s;
}
