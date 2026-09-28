// Turns play-by-play rows into the compact records the "see the plays"
// lists show, and collects only the plays some list actually uses.

import { num } from "./csv";
import { playKey, type PbpRow } from "./pbp";
import type { PlayRecord } from "../../lib/data/types";

function ordinalDown(d: number): string {
  return ["", "1st", "2nd", "3rd", "4th"][d] ?? `${d}th`;
}

// "3rd & 7 at PIT 34", "1st & Goal at JAX 4"; empty for kicks and
// anything without a down.
function situation(r: PbpRow): string {
  const down = num(r.down);
  if (!down) return "";
  const togo = r.goal_to_go === "1" ? "Goal" : String(num(r.ydstogo));
  return `${ordinalDown(down)} & ${togo}${r.yrdln && r.yrdln !== "NA" ? ` at ${r.yrdln}` : ""}`;
}

export function toPlayRecord(r: PbpRow, team: string): PlayRecord {
  const opponent = r.home_team === team ? r.away_team : r.home_team;
  const epa = r.epa === "" || r.epa === "NA" ? null : num(r.epa);
  return {
    key: playKey(r),
    week: num(r.week),
    opponent,
    quarter: num(r.qtr),
    clock: (r.time || "").replace(/^0(?=\d:)/, ""),
    situation: situation(r),
    offense: r.posteam,
    description: r.desc || "",
    yards: num(r.yards_gained),
    neEpa: epa === null ? null : r.posteam === team ? epa : -epa,
  };
}

/** Accumulates records for the plays a set of lists refers to. */
export class PlayCollector {
  readonly plays: Record<string, PlayRecord> = {};
  constructor(private readonly team: string) {}
  add(r: PbpRow): string {
    const key = playKey(r);
    if (!this.plays[key]) this.plays[key] = toPlayRecord(r, this.team);
    return key;
  }
}
