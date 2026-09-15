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

// Combines a game's date + Eastern kickoff time into a real ISO timestamp
// (rather than treating the date as UTC midnight, which would make a
// countdown fire ~13-17 hours before actual kickoff). DST is approximated
// by a fixed early-November cutoff — off by at most a day around the
// transition itself, fine for a countdown display, not used for any stat.
export function kickoffIso(date: string, kickoffTimeEt?: string): string {
  if (!kickoffTimeEt) return `${date}T17:00:00-04:00`; // assume 1pm ET if unknown
  const month = Number(date.split("-")[1]);
  const isEdt = month === 9 || month === 10; // DST ends first Sunday of November
  const offset = isEdt ? "-04:00" : "-05:00";
  return `${date}T${kickoffTimeEt}:00${offset}`;
}
