import { loadCsv, bool01 } from "./csv";

interface FtnRow {
  nflverse_game_id: string;
  nflverse_play_id: string;
  is_qb_fault_sack: string;
}

// Set of "gameId|playId" keys for sacks FTN's human charters flagged as
// the QB's own fault (held the ball too long, scrambled into pressure,
// bad protection call) rather than a real blocking breakdown. Used to
// exclude these from the OL pass-protection grade, which otherwise
// (via raw sack rate allowed) blames the line for every sack regardless
// of cause. Keyed the same way play_by_play.csv is (game_id + play_id) —
// FTN's own file calls the matching columns nflverse_game_id/
// nflverse_play_id.
export async function loadQbFaultSackKeys(): Promise<Set<string>> {
  const rows = await loadCsv<FtnRow>("ftn_charting_2026.csv");
  const keys = new Set<string>();
  for (const r of rows) {
    if (bool01(r.is_qb_fault_sack)) {
      keys.add(`${r.nflverse_game_id}|${r.nflverse_play_id}`);
    }
  }
  return keys;
}
