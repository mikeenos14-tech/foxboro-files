import { loadCsv, bool01 } from "./csv";
import type { FtnReceivingFlags } from "./receiving";

interface FtnRow {
  nflverse_game_id: string;
  nflverse_play_id: string;
  is_qb_fault_sack: string;
  is_interception_worthy: string;
  is_play_action: string;
  is_screen_pass: string;
  is_catchable_ball: string;
  is_drop: string;
  is_contested_ball: string;
  is_created_reception: string;
  n_blitzers: string;
  is_qb_out_of_pocket: string;
}

// Keys below are "gameId|playId", the way play_by_play.csv identifies a
// play — FTN's own file calls the matching columns nflverse_game_id/
// nflverse_play_id. (A QB-fault-sack loader used to live here, described
// in the docs as feeding the pass-protection grade; nothing called it.)

// Real charted turnover-worthy plays. The site previously showed raw
// interception rate under the label "turnover-worthy rate", which
// overstates what's measured in both directions: it counts picks that
// weren't the QB's fault (tipped balls, receiver falls down) and misses
// the dropped interceptions that a charter flags. The methodology doc
// even claimed "a true charting-based version isn't free" — it is, and
// it's in a file this project already downloads on every run.
export interface FtnPlayContext {
  isPlayAction: boolean;
  isScreen: boolean;
  blitzers: number;
  isOutOfPocket: boolean;
}

// Per-play charting context, keyed like the sets above. Twelve of the
// thirteen charted fields in this file went unused; these are the ones
// that actually change how you read a QB's numbers — whether he's
// producing on play-action or off schedule, and whether he holds up
// against extra rushers.
export async function loadPlayContext(): Promise<Map<string, FtnPlayContext>> {
  const rows = await loadCsv<FtnRow>("ftn_charting_2026.csv");
  const map = new Map<string, FtnPlayContext>();
  for (const r of rows) {
    map.set(`${r.nflverse_game_id}|${r.nflverse_play_id}`, {
      isPlayAction: bool01(r.is_play_action),
      isScreen: bool01(r.is_screen_pass),
      blitzers: Number(r.n_blitzers) || 0,
      isOutOfPocket: bool01(r.is_qb_out_of_pocket),
    });
  }
  return map;
}

// Games FTN has charted so far. Charting lands a game or more behind the
// play-by-play, so any rate built from FTN flags has to use only these
// games for its denominator too — otherwise the flags cover Weeks 1-2,
// the plays cover Weeks 1-3, and the rate quietly comes out low while
// labelled "Full Season".
export async function loadChartedGameIds(season = 2026): Promise<Set<string>> {
  const rows = await loadCsv<FtnRow>(`ftn_charting_${season}.csv`);
  return new Set(rows.map((r) => r.nflverse_game_id));
}

export async function loadInterceptionWorthyKeys(season = 2026): Promise<Set<string>> {
  const rows = await loadCsv<FtnRow>(`ftn_charting_${season}.csv`);
  const keys = new Set<string>();
  for (const r of rows) {
    if (bool01(r.is_interception_worthy)) {
      keys.add(`${r.nflverse_game_id}|${r.nflverse_play_id}`);
    }
  }
  return keys;
}

// Receiver-side charting flags, keyed like everything else here. These
// are what make it possible to separate receiver play from quarterback
// play — see lib/receiving.ts for why that matters.
export async function loadReceivingFlags(): Promise<Map<string, FtnReceivingFlags>> {
  const rows = await loadCsv<FtnRow>("ftn_charting_2026.csv");
  const map = new Map<string, FtnReceivingFlags>();
  for (const r of rows) {
    map.set(`${r.nflverse_game_id}|${r.nflverse_play_id}`, {
      catchable: bool01(r.is_catchable_ball),
      drop: bool01(r.is_drop),
      contested: bool01(r.is_contested_ball),
      created: bool01(r.is_created_reception),
    });
  }
  return map;
}
