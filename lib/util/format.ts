export function formatDate(iso: string): string {
  // Date-only ISO strings ("2026-09-21") parse as UTC midnight; formatting
  // in a timezone behind UTC would otherwise roll the date back a day.
  // Anchoring to noon UTC keeps the calendar date stable everywhere.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T12:00:00Z`)
    : new Date(iso);
  // Pinning the timezone (rather than leaving it to the runtime's local
  // zone) matters for two reasons: it keeps every date framed in the
  // team's own Eastern time regardless of a visitor's own location, and it
  // makes the formatted string identical between the server (Vercel's
  // build/render machines run in UTC) and the client (whatever timezone
  // the visitor's browser is in) — without it, a news timestamp near UTC
  // midnight could format to a different calendar day server-side vs
  // client-side, which React reports as a hydration mismatch.
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

// "vs. BUF" at home, "at BUF" on the road — the site used "vs." for both,
// and an AI recap duly placed a game in Jacksonville at Foxboro.
export function opponentLabel(opponent: string, isHome: boolean): string {
  return `${isHome ? "vs." : "at"} ${opponent}`;
}

export function formatPercent(value: number, digits = 0): string {
  // toPrecision strips float noise first: 51/80 * 100 is 63.74999…, which
  // toFixed alone rounds to 63.7 where every box score prints 63.8.
  return `${Number((value * 100).toPrecision(12)).toFixed(digits)}%`;
}

// A unit's real rate beside its grade: EPA as a signed number, the
// rest as a percentage. Matched on substring, not the exact label — an
// exact "EPA/play" check once fell through to the percent formatter and
// rendered -0.152 EPA/play as "-15.2%".
export function formatUnitRate(rawLabel: string, rawValue: number): string {
  return rawLabel.includes("EPA") ? signed(rawValue, 2) : formatPercent(rawValue, 1);
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

// Picks a single representative emoji for a forecast. Deliberately coarse
// (we only have temp/wind/precip, not sky condition) — precip and extreme
// temp take priority since those are what actually affect a game, with a
// generic "mild" glyph as the honest default rather than guessing sunny.
export function weatherEmoji(weather: {
  tempF: number;
  precipitation: string;
  isDome: boolean;
}): string {
  if (weather.isDome) return "🏟️";
  const precipPct = parseInt(weather.precipitation, 10) || 0;
  if (precipPct >= 50) return weather.tempF <= 34 ? "🌨️" : "🌧️";
  if (precipPct >= 20) return "🌦️";
  if (weather.tempF <= 32) return "❄️";
  if (weather.tempF <= 45) return "🥶";
  if (weather.tempF >= 85) return "🥵";
  return "🌤️";
}
