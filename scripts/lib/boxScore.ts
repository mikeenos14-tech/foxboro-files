// Official box-score passing, from play-by-play.
//
// nflverse sets pass_attempt = 1 on every dropback — sacks included, and
// two-point tries too. That's the right population for per-dropback
// metrics (EPA/dropback, sack rate, pressure splits), and the wrong one
// for a box score: the site once showed Drake Maye at 51/89 for 547 yds
// when the real line was 51/80 for 585, because nine sacks were counted
// as attempts and their lost yardage was netted out of passing yards.
//
// The rule below reproduces nflverse's own stats_player totals exactly
// for every passer in the league (checked 51/51 in Week 3 of 2026), and
// verify-data.ts re-checks it against that file on every build.

import { bool01, num } from "./csv";
import type { PbpRow } from "./pbp";

// A thrown pass that counts as an attempt in the official box score.
// Spikes and throwaways count (the NFL counts them); sacks and two-point
// tries don't.
export function isOfficialPassAttempt(r: PbpRow): boolean {
  return bool01(r.pass_attempt) && !bool01(r.sack) && !bool01(r.two_point_attempt);
}

export interface PassingLine {
  completions: number;
  attempts: number;
  yards: number;
  tds: number;
  ints: number;
}

// Accepts any rows (a dropback set, a whole team's plays) and keeps only
// the ones that belong in a box score, so callers can't forget to.
export function passingLine(rows: PbpRow[]): PassingLine {
  const throws = rows.filter(isOfficialPassAttempt);
  return {
    completions: throws.filter((r) => bool01(r.complete_pass)).length,
    attempts: throws.length,
    // passing_yards is nflverse's own per-play credit (NA on incompletions)
    // — gross yards, the way every box score reports them.
    yards: throws.reduce((sum, r) => sum + num(r.passing_yards), 0),
    tds: throws.filter((r) => bool01(r.pass_touchdown)).length,
    ints: throws.filter((r) => bool01(r.interception)).length,
  };
}
