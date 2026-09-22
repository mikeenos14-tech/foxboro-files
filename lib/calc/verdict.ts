import type { TeamStatSnapshot } from "@/lib/data/types";

// Turns the Team Strength ranks into the answer the site exists to give:
// "is my team good?" Previously the Home page's most prominent element
// restated the win-loss record that was already displayed directly above
// it, and the actual verdict was left for the reader to assemble out of
// seven equally-weighted stat cards pointing in different directions.
//
// Everything here is derived from ranks already computed and displayed on
// the same page — this adds no new claims, it just states the conclusion
// those numbers already support.

export type VerdictTone = "good" | "mixed" | "bad";

export interface Verdict {
  headline: string;
  detail: string;
  tone: VerdictTone;
}

// 1-32 league rank → plain English. Deliberately coarse: with this few
// games, "6th" and "9th" are not meaningfully different, and pretending
// otherwise is the same false precision the grades had.
function tierWord(rank: number): string {
  if (rank <= 5) return "elite";
  if (rank <= 10) return "strong";
  if (rank <= 16) return "above average";
  if (rank <= 22) return "below average";
  if (rank <= 27) return "weak";
  return "among the worst in the league";
}

function isGood(rank: number): boolean {
  return rank <= 12;
}
function isBad(rank: number): boolean {
  return rank >= 21;
}

export function buildVerdict(
  stats: TeamStatSnapshot,
  wins: number,
  losses: number,
  ties: number
): Verdict {
  const offRank = stats.epaPerPlay.offense.leagueRank;
  const defRank = stats.epaPerPlay.defense.leagueRank;
  const diffRank = stats.pointDifferential.leagueRank;

  const record = `${wins}-${losses}${ties > 0 ? `-${ties}` : ""}`;

  // The headline names the side of the ball that actually characterises
  // the team, rather than averaging them into mush.
  let headline: string;
  let tone: VerdictTone;

  if (isGood(offRank) && isGood(defRank)) {
    headline = `The Patriots are good on both sides of the ball.`;
    tone = "good";
  } else if (isBad(offRank) && isBad(defRank)) {
    headline = `The Patriots are struggling on both sides of the ball.`;
    tone = "bad";
  } else if (isGood(defRank) && !isGood(offRank)) {
    headline = `The Patriots are a defense carrying an offense.`;
    tone = isBad(offRank) ? "mixed" : "good";
  } else if (isGood(offRank) && !isGood(defRank)) {
    headline = `The Patriots are an offense outrunning its defense.`;
    tone = isBad(defRank) ? "mixed" : "good";
  } else {
    headline = `The Patriots are a middle-of-the-pack team so far.`;
    tone = "mixed";
  }

  // Explicitly season-scoped: the Team Strength cards directly below can
  // be filtered to a shorter window, and without this framing a reader
  // sees two different ranks for the same metric and can't tell why.
  const detail =
    `On the season: ${record}, with the ${tierWord(offRank)} offense (${offRank}${ordinalSuffix(offRank)} in EPA/play) ` +
    `and ${tierWord(defRank)} defense (${defRank}${ordinalSuffix(defRank)}). ` +
    `Point differential ranks ${diffRank}${ordinalSuffix(diffRank)}.`;

  return { headline, detail, tone };
}

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
