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
import { blendWithPrior, OPPONENT_BASELINE_SHRINK_GAMES } from "./priorBlend";

interface GamePerf {
  gameId: string;
  opponent: string;
  valueSum: number;
  n: number;
}

// Every team's per-game performances on one side of the ball, built in a
// single pass over the rows.
//
// This used to be a per-team function called once per team per side —
// 64 full scans of the play-by-play for every metric. That was fine when
// only the three Next Game matchup pairs used it, but the position-group
// grades need the same adjustment across eight groups and several
// windows, which would have meant hundreds of scans of ~48k rows. One
// pass, bucketed by team, makes that tractable.
function perGamePerformancesAllTeams(
  rows: PbpRow[],
  side: "posteam" | "defteam",
  filter: (r: PbpRow) => boolean,
  value: (r: PbpRow) => number
): Map<string, GamePerf[]> {
  const oppSide = side === "posteam" ? "defteam" : "posteam";
  const byTeamGame = new Map<string, Map<string, GamePerf>>();
  for (const r of rows) {
    const team = r[side];
    if (!team || !filter(r)) continue;
    let games = byTeamGame.get(team);
    if (!games) {
      games = new Map<string, GamePerf>();
      byTeamGame.set(team, games);
    }
    const gid = r.game_id;
    const cur = games.get(gid) ?? { gameId: gid, opponent: r[oppSide], valueSum: 0, n: 0 };
    cur.valueSum += value(r);
    cur.n += 1;
    games.set(gid, cur);
  }
  const out = new Map<string, GamePerf[]>();
  for (const [team, games] of byTeamGame) out.set(team, [...games.values()]);
  return out;
}

// League-average raw value this metric/side this season (plays-weighted) —
// the shrinkage target for a thin-sample opponent baseline below. Same
// rationale as leagueRanks.ts's computeAdjustedEpa: an opponent's own
// leave-one-out baseline is a noisy, sometimes single-game sample early in
// the season, and trusting it at full face value can make an ordinary
// performance against a fluky outlier read as historic. Shrinking toward
// the current league average — real regression to the mean, weighted by
// how many OTHER games the opponent has played, via the same linear taper
// used everywhere else — fixes the adjustment step itself without touching
// the separate prior-season blend already applied below.
function leagueAverage(byTeam: Map<string, GamePerf[]>): number {
  let sum = 0;
  let n = 0;
  for (const games of byTeam.values()) {
    for (const g of games) {
      sum += g.valueSum;
      n += g.n;
    }
  }
  return n === 0 ? 0 : sum / n;
}

function shrunkBaseline(
  games: GamePerf[] | undefined,
  gameId: string,
  leagueAvg: number
): number {
  if (!games) return leagueAvg;
  let sum = 0;
  let n = 0;
  let otherGames = 0;
  for (const g of games) {
    if (g.gameId === gameId) continue;
    sum += g.valueSum;
    n += g.n;
    otherGames++;
  }
  const raw = n === 0 ? leagueAvg : sum / n;
  return blendWithPrior(leagueAvg, raw, otherGames, OPPONENT_BASELINE_SHRINK_GAMES);
}

function adjustedAverage(
  teamGames: GamePerf[],
  opponentGamesByTeam: Map<string, GamePerf[]>,
  leagueAvgForOpponentSide: number
): number | null {
  if (teamGames.length === 0) return null;
  let sum = 0;
  let n = 0;
  for (const g of teamGames) {
    const oppBaseline = shrunkBaseline(opponentGamesByTeam.get(g.opponent), g.gameId, leagueAvgForOpponentSide);
    const rawThisGame = g.valueSum / g.n;
    const adjustedThisGame = rawThisGame - oppBaseline;
    sum += adjustedThisGame * g.n;
    n += g.n;
  }
  return sum / n;
}

// Both sides of a metric for every team, opponent-adjusted and nothing
// else — no prior-season blend.
//
// Split out from computeAdjustedPair because the two callers want
// different things. The Next Game matchup grades are predictive, so they
// want the 2025 blend on top. The position-group grades are descriptive
// ("how has this unit actually played this year") and have no
// position-level 2025 prior to blend with anyway — but they still need
// the adjustment, because a unit's grade shouldn't depend on whether
// it happened to draw good or bad opponents so far.
//
// Also returns each team's play count per side, since callers shrink the
// result toward the league mean by sample size (see lib/shrink.ts) and
// would otherwise have to recount the same rows.
export function computeOpponentAdjustedPair(
  rows: PbpRow[],
  teams: string[],
  metric: { filter: (r: PbpRow) => boolean; value: (r: PbpRow) => number }
): {
  a: Map<string, number>;
  b: Map<string, number>;
  aPlays: Map<string, number>;
  bPlays: Map<string, number>;
  gamesPlayed: Map<string, number>;
} {
  const aByTeam = perGamePerformancesAllTeams(rows, "posteam", metric.filter, metric.value);
  const bByTeam = perGamePerformancesAllTeams(rows, "defteam", metric.filter, metric.value);
  for (const team of teams) {
    if (!aByTeam.has(team)) aByTeam.set(team, []);
    if (!bByTeam.has(team)) bByTeam.set(team, []);
  }
  const leagueAvgA = leagueAverage(aByTeam);
  const leagueAvgB = leagueAverage(bByTeam);

  const a = new Map<string, number>();
  const b = new Map<string, number>();
  const aPlays = new Map<string, number>();
  const bPlays = new Map<string, number>();
  const gamesPlayed = new Map<string, number>();
  const countPlays = (games: GamePerf[]) => games.reduce((sum, g) => sum + g.n, 0);

  for (const team of teams) {
    const aGames = aByTeam.get(team) ?? [];
    const bGames = bByTeam.get(team) ?? [];
    a.set(team, adjustedAverage(aGames, bByTeam, leagueAvgB) ?? 0);
    b.set(team, adjustedAverage(bGames, aByTeam, leagueAvgA) ?? 0);
    aPlays.set(team, countPlays(aGames));
    bPlays.set(team, countPlays(bGames));
    gamesPlayed.set(team, aGames.length);
  }
  return { a, b, aPlays, bPlays, gamesPlayed };
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
  const adjusted = computeOpponentAdjustedPair(rows, teams, metric);

  const a = new Map<string, number>();
  const b = new Map<string, number>();
  for (const team of teams) {
    const played = adjusted.gamesPlayed.get(team) ?? 0;
    a.set(team, blendWithPrior(priorA[team] ?? 0, adjusted.a.get(team) ?? 0, played));
    b.set(team, blendWithPrior(priorB[team] ?? 0, adjusted.b.get(team) ?? 0, played));
  }
  return { a, b };
}

export const epaValue = (r: PbpRow) => num(r.epa);
export const sackIndicator = (r: PbpRow) => (bool01(r.sack) ? 1 : 0);
export const isPassAttempt = (r: PbpRow) => bool01(r.pass_attempt);
