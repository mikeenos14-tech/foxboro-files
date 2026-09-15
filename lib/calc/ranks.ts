export function rankTier(leagueRank: number): "good" | "mid" | "bad" {
  if (leagueRank <= 10) return "good";
  if (leagueRank <= 21) return "mid";
  return "bad";
}

// Same good/mid/bad split as rankTier, but for a 0-100 percentile-style
// grade (higher is better) instead of a 1-32 league rank.
export function gradeTier(grade: number): "good" | "mid" | "bad" {
  if (grade >= 69) return "good";
  if (grade >= 34) return "mid";
  return "bad";
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
