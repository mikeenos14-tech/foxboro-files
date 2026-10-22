// A player's whole-season stat line, across every team he played for.
//
// The site's boards are per team. nflverse's official totals are one line
// per player per season — both teams combined after a trade. Comparing a
// traded player's one-team line against his two-team total is guaranteed
// to "fail": in Week 7, 2026 the league-wide audit flagged Marvin Harrison
// Jr. (Arizona, then Houston) as 3 catches against nflverse's 8. The same
// comparison guards the refresh for New England's own players, so a
// deadline acquisition would have blocked the site the first time he
// played. This adds up every team's line for the player before comparing.

import type { PbpRow } from "./pbp";
import { defensiveLeaders, receivingLeaders, rushingLeaders, type PlayerStatLine } from "./leaderboards";
import { ALL_TEAMS } from "./teams";

export type BoardKind = "receiving" | "rushing" | "defense";

/** "8/17" counts as two numbers: label and `${label}#2`. */
export function lineNumbers(line: PlayerStatLine): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of line.stats) {
    const parts = String(s.value).split("/");
    const a = Number(parts[0]);
    if (Number.isFinite(a)) out[s.label] = a;
    if (parts.length === 2 && Number.isFinite(Number(parts[1]))) out[`${s.label}#2`] = Number(parts[1]);
  }
  return out;
}

export interface SeasonLine {
  numbers: Record<string, number>;
  teams: string[];
}

/** Every player's season line on one board, summed across all 32 teams. */
export function seasonLines(pbp: PbpRow[], kind: BoardKind): Map<string, SeasonLine> {
  const board = kind === "receiving" ? receivingLeaders : kind === "rushing" ? rushingLeaders : defensiveLeaders;
  const out = new Map<string, SeasonLine>();
  for (const team of ALL_TEAMS) {
    for (const line of board(pbp, new Map(), team)) {
      const nums = lineNumbers(line);
      const cur = out.get(line.playerId) ?? { numbers: {}, teams: [] };
      for (const [k, v] of Object.entries(nums)) cur.numbers[k] = (cur.numbers[k] ?? 0) + v;
      cur.teams.push(team);
      out.set(line.playerId, cur);
    }
  }
  return out;
}
