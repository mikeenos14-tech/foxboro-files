// One definition of what each position group is measured by, and one
// pipeline that turns that into a grade.
//
// Grades are now: opponent-adjust -> shrink toward the league mean ->
// rank. Previously they were raw per-play values ranked directly, which
// meant a unit's grade depended on the schedule it happened to draw. NE's
// secondary graded 97th percentile off two games against Seattle and
// Pittsburgh specifically; nothing in the number accounted for who those
// opponents were. The team-level EPA on Home has been opponent-adjusted
// all along — this closes the gap for the unit grades.
//
// Order matters. Opponent adjustment happens per game (each game is
// compared against what that opponent does in its other games, with a
// thin-sample baseline regressed toward league average — see
// adjustedRate.ts). Shrinkage then applies to the resulting season value
// based on total sample size. Adjusting first and shrinking second keeps
// the two corrections doing separate jobs: one for schedule, one for
// sample.

import { bool01, num } from "./csv";
import type { PbpRow } from "./pbp";
import type { RosterRow } from "./roster";
import { computeOpponentAdjustedPair } from "./adjustedRate";
import { SHRINK_K, leagueMean, shrink } from "./shrink";
import { rankGeneric } from "./rank";

export interface GroupMetric {
  label: string;
  /** Which side of the ball the group's own production shows up on. */
  side: "offense" | "defense";
  higherIsBetter: boolean;
  shrinkK: number;
  filter: (r: PbpRow, roster: Map<string, RosterRow>) => boolean;
  value: (r: PbpRow) => number;
}

const epaValue = (r: PbpRow) => num(r.epa);
const pressureIndicator = (r: PbpRow) => (bool01(r.sack) || bool01(r.qb_hit) ? 1 : 0);
const sackIndicator = (r: PbpRow) => (bool01(r.sack) ? 1 : 0);

// A play belongs to a position group when the player credited with it is
// listed at that position. Note this works identically on both sides:
// filtered from the offense it's "our tight ends' production", filtered
// from the defense it's "tight end production allowed" — which is exactly
// the opponent baseline the adjustment needs.
const byReceiverPosition = (position: string) => (r: PbpRow, roster: Map<string, RosterRow>) =>
  r.play_type === "pass" && !!r.receiver_id && roster.get(r.receiver_id)?.position === position;

export const GROUP_METRICS: GroupMetric[] = [
  {
    label: "QB",
    side: "offense",
    higherIsBetter: true,
    shrinkK: SHRINK_K.passingEpa,
    filter: (r, roster) => r.play_type === "pass" && !!r.passer_id && roster.get(r.passer_id)?.position === "QB",
    value: epaValue,
  },
  {
    label: "RB",
    side: "offense",
    higherIsBetter: true,
    shrinkK: SHRINK_K.rushingEpa,
    filter: (r, roster) => r.play_type === "run" && !!r.rusher_id && roster.get(r.rusher_id)?.position === "RB",
    value: epaValue,
  },
  {
    label: "WR",
    side: "offense",
    higherIsBetter: true,
    shrinkK: SHRINK_K.receivingEpa,
    filter: byReceiverPosition("WR"),
    value: epaValue,
  },
  {
    label: "TE",
    side: "offense",
    higherIsBetter: true,
    shrinkK: SHRINK_K.receivingEpa,
    filter: byReceiverPosition("TE"),
    value: epaValue,
  },
  {
    // Pressure rate allowed rather than sack rate: a tackle who gets
    // beaten and is bailed out by a quick throw shouldn't grade clean.
    label: "OL",
    side: "offense",
    higherIsBetter: false,
    shrinkK: SHRINK_K.teamRate,
    filter: (r) => bool01(r.pass_attempt),
    value: pressureIndicator,
  },
  {
    label: "Edge",
    side: "defense",
    higherIsBetter: true,
    shrinkK: SHRINK_K.teamRate,
    filter: (r) => bool01(r.pass_attempt),
    value: sackIndicator,
  },
  {
    label: "Interior DL",
    side: "defense",
    higherIsBetter: false,
    shrinkK: SHRINK_K.teamRate,
    filter: (r) => r.play_type === "run",
    value: epaValue,
  },
  {
    label: "Secondary",
    side: "defense",
    higherIsBetter: false,
    shrinkK: SHRINK_K.teamRate,
    filter: (r) => r.play_type === "pass",
    value: epaValue,
  },
];

export interface GroupGrade {
  grade: number;
  /** The team's own opponent-adjusted value, before ranking. */
  adjustedValue: number;
  sampleSize: number;
}

// Computes one group's grade for every team in one shot. Returns a map so
// callers can grade the featured team and the whole league without
// repeating the (expensive) adjustment pass.
export function gradeGroupAllTeams(
  rows: PbpRow[],
  teams: string[],
  roster: Map<string, RosterRow>,
  metric: GroupMetric
): Map<string, GroupGrade> {
  const adjusted = computeOpponentAdjustedPair(rows, teams, {
    filter: (r) => metric.filter(r, roster),
    value: metric.value,
  });

  const values = metric.side === "offense" ? adjusted.a : adjusted.b;
  const plays = metric.side === "offense" ? adjusted.aPlays : adjusted.bPlays;

  const samples = teams.map((t) => ({ value: values.get(t) ?? 0, n: plays.get(t) ?? 0 }));
  const mean = leagueMean(samples);
  const shrunk = new Map(
    teams.map((t) => [t, shrink({ value: values.get(t) ?? 0, n: plays.get(t) ?? 0 }, mean, metric.shrinkK)])
  );

  const out = new Map<string, GroupGrade>();
  for (const team of teams) {
    out.set(team, {
      grade: rankGeneric(teams, team, (t) => shrunk.get(t) ?? 0, metric.higherIsBetter).leaguePercentile,
      adjustedValue: values.get(team) ?? 0,
      sampleSize: plays.get(team) ?? 0,
    });
  }
  return out;
}
