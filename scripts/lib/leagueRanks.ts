import { num } from "./csv";
import { offenseStats, defenseStats, type PbpRow } from "./pbp";
import type { RankedStat } from "../../lib/data/types";

interface LeagueEpaEntry {
  team: string;
  offenseEpa: number;
  offenseSuccess: number;
  offenseExplosive: number;
  defenseEpa: number;
  defenseSuccess: number;
  defenseExplosive: number;
}

function isScrimmage(r: PbpRow): boolean {
  return r.play_type === "run" || r.play_type === "pass";
}

interface GamePerf {
  gameId: string;
  opponent: string;
  epaSum: number;
  plays: number;
}

// Every game a team played on the given side of the ball, aggregated to
// one EPA sum + play count per game (a team faces one opponent per game,
// so this also doubles as the game-by-game opponent list).
function perGamePerformances(
  rows: PbpRow[],
  team: string,
  side: "posteam" | "defteam"
): GamePerf[] {
  const oppSide = side === "posteam" ? "defteam" : "posteam";
  const byGame = new Map<string, GamePerf>();
  for (const r of rows) {
    if (!isScrimmage(r) || r[side] !== team) continue;
    const gid = r.game_id;
    const cur = byGame.get(gid) ?? { gameId: gid, opponent: r[oppSide], epaSum: 0, plays: 0 };
    cur.epaSum += num(r.epa);
    cur.plays += 1;
    byGame.set(gid, cur);
  }
  return [...byGame.values()];
}

// Opponent-adjusted EPA/play: raw EPA/play treats every opponent as
// equally good, so a defense can rank highly just from facing bad
// offenses (and vice versa). This adjusts each game relative to what
// that specific opponent does on average in their OTHER games — a
// defense gets more credit for holding a normally-strong offense down
// than for doing the same against a normally-weak one.
//
// Critically, the opponent's baseline excludes the very game being
// adjusted (leave-one-out). Skipping that would be circular — early in
// the season, two teams that have only played each other would each
// just be adjusting against a "baseline" built entirely from that same
// game, which collapses every adjusted value to ~0 by construction, not
// a real signal. When an opponent has no OTHER games yet to form an
// independent baseline, this simply falls back to the raw value for that
// game (no adjustment) rather than manufacturing a fake one — real
// adjustment phases in naturally as more of the schedule is played.
//
// This is a simple one-pass adjustment, not a full iterative strength-of-
// schedule solve like SRS/Elo (which would also account for the
// opponent's own opponents, recursively) — deliberately kept simple.
// Success rate and explosive-play rate stay raw/unadjusted for the same
// reason.
function computeAdjustedEpa(
  rows: PbpRow[],
  teams: string[]
): { offense: Map<string, number>; defense: Map<string, number> } {
  const offByTeam = new Map<string, GamePerf[]>();
  const defByTeam = new Map<string, GamePerf[]>();
  for (const team of teams) {
    offByTeam.set(team, perGamePerformances(rows, team, "posteam"));
    defByTeam.set(team, perGamePerformances(rows, team, "defteam"));
  }

  // Opponent's own raw EPA/play across all their games EXCEPT gameId.
  function baselineExcluding(games: GamePerf[] | undefined, gameId: string): number | null {
    if (!games) return null;
    let sum = 0;
    let plays = 0;
    for (const g of games) {
      if (g.gameId === gameId) continue;
      sum += g.epaSum;
      plays += g.plays;
    }
    return plays === 0 ? null : sum / plays;
  }

  function adjustedAverage(
    teamGames: GamePerf[],
    opponentGamesByTeam: Map<string, GamePerf[]>
  ): number {
    if (teamGames.length === 0) return 0;
    let sum = 0;
    let plays = 0;
    for (const g of teamGames) {
      const oppBaseline = baselineExcluding(opponentGamesByTeam.get(g.opponent), g.gameId);
      const rawThisGame = g.epaSum / g.plays;
      const adjustedThisGame = oppBaseline === null ? rawThisGame : rawThisGame - oppBaseline;
      sum += adjustedThisGame * g.plays;
      plays += g.plays;
    }
    return sum / plays;
  }

  const offense = new Map<string, number>();
  const defense = new Map<string, number>();
  for (const team of teams) {
    // Offense is adjusted against each opponent's defensive baseline, and
    // vice versa.
    offense.set(team, adjustedAverage(offByTeam.get(team) ?? [], defByTeam));
    defense.set(team, adjustedAverage(defByTeam.get(team) ?? [], offByTeam));
  }
  return { offense, defense };
}

export function computeLeagueEpaTable(
  rows: PbpRow[],
  teams: string[]
): Map<string, LeagueEpaEntry> {
  const adjusted = computeAdjustedEpa(rows, teams);
  const table = new Map<string, LeagueEpaEntry>();
  for (const team of teams) {
    const off = offenseStats(rows, team);
    const def = defenseStats(rows, team);
    table.set(team, {
      team,
      offenseEpa: adjusted.offense.get(team) ?? off.epa,
      offenseSuccess: off.successRate,
      offenseExplosive: off.explosiveRate,
      defenseEpa: adjusted.defense.get(team) ?? def.epa,
      defenseSuccess: def.successRate,
      defenseExplosive: def.explosiveRate,
    });
  }
  return table;
}

// higherIsBetter=true: rank 1 goes to the highest value (offense).
// higherIsBetter=false: rank 1 goes to the lowest value (defense, where
// allowing less EPA/play is better).
function rankOf(
  table: Map<string, LeagueEpaEntry>,
  team: string,
  selector: (e: LeagueEpaEntry) => number,
  higherIsBetter: boolean
): RankedStat {
  const entries = [...table.values()];
  const sorted = entries
    .map((e) => ({ team: e.team, value: selector(e) }))
    .sort((a, b) => (higherIsBetter ? b.value - a.value : a.value - b.value));
  const idx = sorted.findIndex((e) => e.team === team);
  const leagueRank = idx === -1 ? sorted.length : idx + 1;
  const value = selector(table.get(team)!);
  const leaguePercentile = Math.round(
    (1 - (leagueRank - 1) / Math.max(1, sorted.length - 1)) * 100
  );
  return { value, leagueRank, leaguePercentile };
}

export function offenseEpaRank(table: Map<string, LeagueEpaEntry>, team: string): RankedStat {
  return rankOf(table, team, (e) => e.offenseEpa, true);
}
export function defenseEpaRank(table: Map<string, LeagueEpaEntry>, team: string): RankedStat {
  return rankOf(table, team, (e) => e.defenseEpa, false);
}
export function offenseSuccessRank(table: Map<string, LeagueEpaEntry>, team: string): RankedStat {
  return rankOf(table, team, (e) => e.offenseSuccess, true);
}
export function defenseSuccessRank(table: Map<string, LeagueEpaEntry>, team: string): RankedStat {
  return rankOf(table, team, (e) => e.defenseSuccess, false);
}
export function offenseExplosiveRank(table: Map<string, LeagueEpaEntry>, team: string): RankedStat {
  return rankOf(table, team, (e) => e.offenseExplosive, true);
}
export function defenseExplosiveRank(table: Map<string, LeagueEpaEntry>, team: string): RankedStat {
  return rankOf(table, team, (e) => e.defenseExplosive, false);
}

export function offenseEpaRankOnly(
  table: Map<string, LeagueEpaEntry>,
  team: string
): number {
  return offenseEpaRank(table, team).leagueRank;
}
export function defenseEpaRankOnly(
  table: Map<string, LeagueEpaEntry>,
  team: string
): number {
  return defenseEpaRank(table, team).leagueRank;
}
