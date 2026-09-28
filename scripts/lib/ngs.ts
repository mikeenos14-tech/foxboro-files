// Next Gen Stats (NFL player tracking, via nflverse) — the few measures
// that answer questions play-by-play can't:
//   - time to throw: is it the line, or is the QB holding the ball?
//   - aggressiveness: share of throws into tight windows (a defender
//     within a yard at the catch point)
//   - separation: are the receivers getting open?
//   - rush yards over expected: is it the back, or the blocking?
//
// Only week 0 rows are used — NGS's own season totals, for players over
// its minimums (about 25 attempts for a QB, 15 carries for a runner, 8
// targets for a receiver). Ranks are among those qualifiers, and every
// place that shows one says "of N qualified" so a 37-QB ranking isn't
// read as a 32-team one.

import { loadCsv, num } from "./csv";
import type { NgsRank } from "../../lib/data/types";

interface NgsRow {
  season: string;
  season_type: string;
  week: string;
  player_gsis_id: string;
  team_abbr: string;
  [column: string]: string;
}

export interface NgsSeason {
  passing: NgsRow[];
  receiving: NgsRow[];
  rushing: NgsRow[];
}

async function seasonRows(file: string, season: number): Promise<NgsRow[]> {
  const rows = await loadCsv<NgsRow>(file);
  return rows.filter(
    (r) => num(r.season) === season && r.season_type === "REG" && r.week === "0"
  );
}

/** Null when the files haven't been fetched — callers show nothing rather than guess. */
export async function loadNgsSeason(season = 2026): Promise<NgsSeason | null> {
  try {
    return {
      passing: await seasonRows("ngs_passing.csv", season),
      receiving: await seasonRows("ngs_receiving.csv", season),
      rushing: await seasonRows("ngs_rushing.csv", season),
    };
  } catch {
    return null;
  }
}

/** A player's value in `column` and where it ranks among everyone in `rows` (1 = highest). */
export function ngsRank(rows: NgsRow[], playerId: string, column: string): NgsRank | null {
  const mine = rows.find((r) => r.player_gsis_id === playerId);
  if (!mine || mine[column] === "" || mine[column] === "NA") return null;
  const value = num(mine[column]);
  const higher = rows.filter((r) => num(r[column]) > value).length;
  return { value, rank: higher + 1, of: rows.length };
}
