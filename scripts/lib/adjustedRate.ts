// Generalized version of the opponent-adjustment + prior-blend pipeline
// in leagueRanks.ts, for the position-group matchup metrics (rush/pass
// EPA, sack rate) that leagueRanks.ts doesn't cover. Same two ideas,
// applied to an arbitrary per-play metric instead of hardcoded to overall
// EPA/play:
//
// 1. Opponent-adjust each game relative to what that specific opponent
//    does on average in their OTHER games (leave-one-out, so two teams
//    that have only played each other don't collapse each other's value
//    to ~0 — see leagueRanks.ts for the full explanation).
// 2. Blend the result with real prior-season performance, linearly
//    phased out to zero by 8 games (scripts/lib/priorBlend.ts).
//
// A metric here is any (filter, value) pair over play rows — e.g. "pass
// plays, valued by EPA" or "dropbacks, valued by 1-if-sacked-else-0"
// (whose mean is exactly the sack rate). Both sides of a matchup (e.g.
// rush offense vs. run defense) are computed together since each is the
// other's opponent baseline.

import { bool01, num } from "./csv";
import type { PbpRow } from "./pbp";
import { blendWithPrior } from "./priorBlend";

interface GamePerf {
  gameId: string;
  opponent: string;
  valueSum: number;
  n: number;
}

function perGamePerformances(
  rows: PbpRow[],
  team: string,
  side: "posteam" | "defteam",
  filter: (r: PbpRow) => boolean,
  value: (r: PbpRow) => number
): GamePerf[] {
  const oppSide = side === "posteam" ? "defteam" : "posteam";
  const byGame = new Map<string, GamePerf>();
  for (const r of rows) {
    if (r[side] !== team || !filter(r)) continue;
    const gid = r.game_id;
    const cur = byGame.get(gid) ?? { gameId: gid, opponent: r[oppSide], valueSum: 0, n: 0 };
    cur.valueSum += value(r);
    cur.n += 1;
    byGame.set(gid, cur);
  }
  return [...byGame.values()];
}

function baselineExcluding(games: GamePerf[] | undefined, gameId: string): number | null {
  if (!games) return null;
  let sum = 0;
  let n = 0;
  for (const g of games) {
    if (g.gameId === gameId) continue;
    sum += g.valueSum;
    n += g.n;
  }
  return n === 0 ? null : sum / n;
}

function adjustedAverage(
  teamGames: GamePerf[],
  opponentGamesByTeam: Map<string, GamePerf[]>
): number | null {
  if (teamGames.length === 0) return null;
  let sum = 0;
  let n = 0;
  for (const g of teamGames) {
    const oppBaseline = baselineExcluding(opponentGamesByTeam.get(g.opponent), g.gameId);
    const rawThisGame = g.valueSum / g.n;
    const adjustedThisGame = oppBaseline === null ? rawThisGame : rawThisGame - oppBaseline;
    sum += adjustedThisGame * g.n;
    n += g.n;
  }
  return sum / n;
}

// Computes both sides of a matchup pair (e.g. rush offense EPA and run
// defense EPA) for every team: opponent-adjusted, then blended with the
// given prior-season tables and phased out by games played.
export function computeAdjustedPair(
  rows: PbpRow[],
  teams: string[],
  metric: { filter: (r: PbpRow) => boolean; value: (r: PbpRow) => number },
  priorA: Record<string, number>,
  priorB: Record<string, number>
): { a: Map<string, number>; b: Map<string, number> } {
  const aByTeam = new Map<string, GamePerf[]>();
  const bByTeam = new Map<string, GamePerf[]>();
  for (const team of teams) {
    aByTeam.set(team, perGamePerformances(rows, team, "posteam", metric.filter, metric.value));
    bByTeam.set(team, perGamePerformances(rows, team, "defteam", metric.filter, metric.value));
  }

  const a = new Map<string, number>();
  const b = new Map<string, number>();
  for (const team of teams) {
    const aGames = aByTeam.get(team) ?? [];
    const bGames = bByTeam.get(team) ?? [];
    const played = aGames.length; // a team has the same # of games on both sides
    const rawA = adjustedAverage(aGames, bByTeam);
    const rawB = adjustedAverage(bGames, aByTeam);
    a.set(team, blendWithPrior(priorA[team] ?? 0, rawA ?? 0, played));
    b.set(team, blendWithPrior(priorB[team] ?? 0, rawB ?? 0, played));
  }
  return { a, b };
}

export const epaValue = (r: PbpRow) => num(r.epa);
export const sackIndicator = (r: PbpRow) => (bool01(r.sack) ? 1 : 0);
export const isPassAttempt = (r: PbpRow) => bool01(r.pass_attempt);
