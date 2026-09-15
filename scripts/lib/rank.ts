import type { RankedStat } from "../../lib/data/types";

export function rankGeneric(
  teams: string[],
  team: string,
  valueOf: (t: string) => number,
  higherIsBetter: boolean
): RankedStat {
  const values = teams.map((t) => ({ t, v: valueOf(t) }));
  const sorted = [...values].sort((a, b) =>
    higherIsBetter ? b.v - a.v : a.v - b.v
  );
  const idx = sorted.findIndex((e) => e.t === team);
  const leagueRank = idx === -1 ? sorted.length : idx + 1;
  const leaguePercentile = Math.round(
    (1 - (leagueRank - 1) / Math.max(1, sorted.length - 1)) * 100
  );
  return { value: valueOf(team), leagueRank, leaguePercentile };
}
