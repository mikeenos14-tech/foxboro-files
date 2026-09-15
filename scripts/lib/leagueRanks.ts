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

export function computeLeagueEpaTable(
  rows: PbpRow[],
  teams: string[]
): Map<string, LeagueEpaEntry> {
  const table = new Map<string, LeagueEpaEntry>();
  for (const team of teams) {
    const off = offenseStats(rows, team);
    const def = defenseStats(rows, team);
    table.set(team, {
      team,
      offenseEpa: off.epa,
      offenseSuccess: off.successRate,
      offenseExplosive: off.explosiveRate,
      defenseEpa: def.epa,
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
