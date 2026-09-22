// Player attribution out of play-by-play, with the fallback nflverse
// requires.
//
// nflverse carries two id columns per role: a short one (rusher_id) and
// a long one (rusher_player_id). They usually agree — but on QB
// scrambles the short one is EMPTY while the long one is populated.
// Code that reads only rusher_id silently drops every scramble in the
// league: 141 of 1,675 run plays in 2026, and with them Drake Maye's
// entire rushing line, which showed as 1 carry for 3 yards against a
// real 11 for 64.
//
// Nothing about that failure is loud. The rows are simply skipped, the
// totals look plausible, and the only way to catch it is to compare
// against nflverse's own aggregation — which verify-data.ts now does.
//
// Always read player ids through these helpers.

import type { PbpRow } from "./pbp";

function firstId(...values: Array<string | undefined>): string {
  for (const v of values) if (v && v !== "NA") return v;
  return "";
}

export function rusherId(r: PbpRow): string {
  return firstId(r.rusher_id, r.rusher_player_id);
}

export function receiverId(r: PbpRow): string {
  return firstId(r.receiver_id, r.receiver_player_id);
}

export function passerId(r: PbpRow): string {
  return firstId(r.passer_id, r.passer_player_id);
}

/** Whoever put the ball on the ground, whatever kind of play it was. */
export function fumblerId(r: PbpRow): string {
  return firstId(r.fumbled_1_player_id);
}

export function fumblerName(r: PbpRow): string {
  return firstId(r.fumbled_1_player_name);
}
