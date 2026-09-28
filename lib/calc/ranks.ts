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

// The site's two number types, written so they can't be mistaken for each
// other. A 0-100 grade is "65/100"; a league rank is "27th of 32". Grades
// used to print as ordinals too ("6th"), so a 6th-percentile run defense
// — one of the league's worst — read as the 6th-ranked one, and the AI
// preview told readers exactly that.
export function formatGrade(grade: number): string {
  return `${Math.round(grade)}/100`;
}

export function gradeWords(grade: number): string {
  if (grade >= 80) return "among the NFL's best";
  if (grade >= 60) return "above average";
  if (grade >= 40) return "about average";
  if (grade >= 20) return "below average";
  return "among the NFL's worst";
}

export function formatRank(rank: number, of = 32): string {
  return `${ordinal(rank)} of ${of}`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
