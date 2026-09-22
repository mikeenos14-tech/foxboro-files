import { loadCsv, bool01 } from "./csv";

interface FtnRow {
  nflverse_game_id: string;
  nflverse_play_id: string;
  is_qb_fault_sack: string;
  is_interception_worthy: string;
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

// Real charted turnover-worthy plays. The site previously showed raw
// interception rate under the label "turnover-worthy rate", which
// overstates what's measured in both directions: it counts picks that
// weren't the QB's fault (tipped balls, receiver falls down) and misses
// the dropped interceptions that a charter flags. The methodology doc
// even claimed "a true charting-based version isn't free" — it is, and
// it's in a file this project already downloads on every run.
export async function loadInterceptionWorthyKeys(): Promise<Set<string>> {
  const rows = await loadCsv<FtnRow>("ftn_charting_2026.csv");
  const keys = new Set<string>();
  for (const r of rows) {
    if (bool01(r.is_interception_worthy)) {
      keys.add(`${r.nflverse_game_id}|${r.nflverse_play_id}`);
    }
  }
  return keys;
}
