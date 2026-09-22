// Receiver-isolated metrics, using FTN's charting to strip out the part
// of receiving production that belongs to the quarterback.
//
// The problem this solves: the WR and TE grades are EPA per target, which
// is mostly a measurement of the passing game rather than the receivers.
// A receiver catching passes from an accurate quarterback grades well
// whatever he does; the same player on a bad offense grades poorly. That
// makes "how good are our receivers" — a question this site exists to
// answer — not actually answerable from the headline grade.
//
// The split is clean in principle: the quarterback controls whether the
// ball arrives catchable, the receiver controls what happens once it
// does. FTN charts exactly that boundary (is_catchable_ball), plus the
// receiver-side events on either side of it (is_drop, is_contested_ball,
// is_created_reception).
//
// So the isolated metrics are:
//   - catch rate on CATCHABLE targets, which removes quarterback
//     inaccuracy from the denominator rather than charging it to the
//     receiver
//   - yards after catch per reception, which is entirely post-catch
//   - contested-catch conversion, reported but deliberately NOT graded:
//     at ~8 contested targets per team this early it's too thin to rank
//     without saying something false.

import { bool01, num } from "./csv";
import type { PbpRow } from "./pbp";
import type { RosterRow } from "./roster";
import { reliability, MIN_RELIABILITY } from "./reliability";

export interface ReceivingSplit {
  targets: number;
  receptions: number;
  /** Targets FTN charted as catchable — the receiver-controlled subset. */
  catchableTargets: number;
  /** Receptions / catchable targets. Undefined when nothing was catchable. */
  catchRateOnCatchable: number | null;
  drops: number;
  yacPerReception: number | null;
  contestedTargets: number;
  contestedCatches: number;
  createdReceptions: number;
  /**
   * Targets that matched an FTN charting row at all. Compared against
   * `targets` this is the charting coverage for the team — a team whose
   * games aren't fully charted must be kept out of league baselines
   * rather than ranked on half its data.
   */
  chartedTargets: number;
  /** Per-catchable-target 1/0 caught, for reliability testing. */
  catchableOutcomes: number[];
  /** Per-reception YAC, for reliability testing. */
  yacValues: number[];
}

const EMPTY: ReceivingSplit = {
  targets: 0,
  receptions: 0,
  catchableTargets: 0,
  catchRateOnCatchable: null,
  drops: 0,
  yacPerReception: null,
  contestedTargets: 0,
  contestedCatches: 0,
  createdReceptions: 0,
  chartedTargets: 0,
  catchableOutcomes: [],
  yacValues: [],
};

export interface FtnReceivingFlags {
  catchable: boolean;
  drop: boolean;
  contested: boolean;
  created: boolean;
}

export function ftnKey(r: PbpRow): string {
  return `${r.game_id}|${r.play_id}`;
}

// Computes the split for whichever targets the caller passes in — the
// position filter lives with the caller so this works for a whole team, a
// position group, or one player.
export function receivingSplit(
  targets: PbpRow[],
  flagsByKey: Map<string, FtnReceivingFlags>
): ReceivingSplit {
  if (targets.length === 0) return { ...EMPTY };

  let receptions = 0;
  let catchableTargets = 0;
  let catchableReceptions = 0;
  let drops = 0;
  let yacSum = 0;
  let yacCount = 0;
  let contestedTargets = 0;
  let contestedCatches = 0;
  let createdReceptions = 0;
  let chartedTargets = 0;
  const catchableOutcomes: number[] = [];
  const yacValues: number[] = [];

  for (const r of targets) {
    const caught = bool01(r.complete_pass);
    const f = flagsByKey.get(ftnKey(r));
    if (caught) {
      receptions++;
      if (r.yards_after_catch !== "" && r.yards_after_catch !== "NA") {
        const y = num(r.yards_after_catch);
        yacSum += y;
        yacCount++;
        yacValues.push(y);
      }
    }
    if (!f) continue;
    chartedTargets++;
    if (f.catchable) {
      catchableTargets++;
      if (caught) catchableReceptions++;
      catchableOutcomes.push(caught ? 1 : 0);
    }
    if (f.drop) drops++;
    if (f.contested) {
      contestedTargets++;
      if (caught) contestedCatches++;
    }
    if (f.created && caught) createdReceptions++;
  }

  return {
    targets: targets.length,
    receptions,
    catchableTargets,
    catchRateOnCatchable: catchableTargets === 0 ? null : catchableReceptions / catchableTargets,
    drops,
    yacPerReception: yacCount === 0 ? null : yacSum / yacCount,
    contestedTargets,
    contestedCatches,
    createdReceptions,
    chartedTargets,
    catchableOutcomes,
    yacValues,
  };
}

// Targets thrown to players at a given roster position, on one side of
// the ball. Filtering from the defence gives the same measure allowed,
// which is what the opponent-adjustment baseline needs.
export function positionTargets(
  rows: PbpRow[],
  roster: Map<string, RosterRow>,
  team: string,
  position: string,
  side: "posteam" | "defteam"
): PbpRow[] {
  return rows.filter(
    (r) =>
      r[side] === team &&
      bool01(r.pass_attempt) &&
      !!r.receiver_id &&
      roster.get(r.receiver_id)?.position === position
  );
}

// A short, honest summary line. Contested is included as raw counts
// rather than a rate, since a rate off single-digit attempts invites
// reading precision that isn't there.
export function receivingDetailLine(split: ReceivingSplit): string {
  if (split.targets === 0) return "";
  const parts: string[] = [];
  if (split.catchRateOnCatchable !== null) {
    // Counts, not a percentage. "95%" off 21 attempts reads as a precise
    // measurement; "20 of 21" shows the reader exactly how much is being
    // claimed, and is the same information.
    const caught = Math.round(split.catchRateOnCatchable * split.catchableTargets);
    parts.push(`${caught} of ${split.catchableTargets} catchable balls caught`);
  }
  parts.push(`${split.drops} drop${split.drops === 1 ? "" : "s"}`);
  if (split.yacPerReception !== null) parts.push(`${split.yacPerReception.toFixed(1)} YAC/rec`);
  if (split.contestedTargets > 0) {
    parts.push(`${split.contestedCatches}/${split.contestedTargets} contested`);
  }
  return parts.join(" · ");
}

// Teams whose games aren't fully charted can't sit in a league
// baseline: a team with half its targets charted has a rate built from
// different football than everyone else's, and it lands at the top or
// bottom of the table for that reason alone. Two teams were at ~48%
// coverage when this was written, and both surfaced near the extremes.
export const MIN_CHART_COVERAGE = 0.9;

export function isFullyCharted(s: ReceivingSplit): boolean {
  return s.targets > 0 && s.chartedTargets / s.targets >= MIN_CHART_COVERAGE;
}

export interface ReceiverIsolatedResult {
  /** Null when no component is reliable enough to rank. */
  grade: number | null;
  /** Component labels that passed the reliability gate. */
  ranked: string[];
  /** Per-component reliability, for logging and tests. */
  diagnostics: Array<{ label: string; reliability: number; n: number }>;
}

// A receiver-isolated grade: the average of the league-ranked,
// sample-shrunk percentiles that are actually measuring something —
// catch rate on catchable balls (hands) and yards after catch per
// reception. Both are downstream of the throw, so neither rewards or
// punishes a receiver for his quarterback.
//
// Every component must clear two gates before it can be ranked:
//
//   1. Charting coverage. Teams whose games aren't fully charted are
//      dropped from the baseline entirely.
//   2. Reliability. The between-team spread has to exceed what chance
//      alone produces at these sample sizes — see lib/reliability.ts.
//      Shrinkage alone does NOT cover this: when the whole league is
//      small-sample, shrinking everyone by the same weight preserves the
//      ordering and the ranking stays noise.
//
// If nothing clears both, the grade is null and the caller shows raw
// counts instead. Early in a season that is the normal outcome, and it
// is the correct one: two games into 2026, WR catch-rate reliability was
// 0.00 and the resulting "3rd in the league" moved to 16th if a single
// drop flipped.
//
// Contested-catch conversion is excluded from the score outright despite
// being the most receiver-ish stat available: at single-digit attempts
// per team it will not clear these gates for most of a season. It's
// reported on the card as raw counts instead.
export function receiverIsolatedGrade(
  splitsByTeam: Map<string, ReceivingSplit>,
  teams: string[],
  team: string,
  shrinkK: number,
  helpers: {
    leagueMean: (s: Array<{ value: number; n: number }>) => number;
    shrink: (s: { value: number; n: number }, mean: number, k: number) => number;
    rank: (teams: string[], team: string, valueOf: (t: string) => number, higherIsBetter: boolean) => number;
  }
): ReceiverIsolatedResult {
  // The baseline is only the fully-charted teams, and we can't rank a
  // team that isn't in its own baseline.
  const eligible = teams.filter((t) => {
    const s = splitsByTeam.get(t);
    return s !== undefined && isFullyCharted(s);
  });
  const diagnostics: ReceiverIsolatedResult["diagnostics"] = [];
  if (!eligible.includes(team)) return { grade: null, ranked: [], diagnostics };

  const component = (
    label: string,
    valueOf: (s: ReceivingSplit) => number | null,
    countOf: (s: ReceivingSplit) => number,
    observationsOf: (s: ReceivingSplit) => number[]
  ): { label: string; percentile: number } | null => {
    const rel = reliability(eligible.map((t) => observationsOf(splitsByTeam.get(t)!)));
    diagnostics.push({ label, reliability: rel.reliability, n: rel.n });
    if (rel.reliability < MIN_RELIABILITY) return null;

    const samples = eligible.map((t) => {
      const s = splitsByTeam.get(t)!;
      return { value: valueOf(s) ?? 0, n: countOf(s) };
    });
    if (samples.every((x) => x.n === 0)) return null;
    const mean = helpers.leagueMean(samples);
    const byTeam = new Map(eligible.map((t, i) => [t, helpers.shrink(samples[i], mean, shrinkK)]));
    return {
      label,
      percentile: helpers.rank(eligible, team, (t) => byTeam.get(t) ?? 0, true),
    };
  };

  const parts = [
    component("Hands", (s) => s.catchRateOnCatchable, (s) => s.catchableTargets, (s) => s.catchableOutcomes),
    component("YAC", (s) => s.yacPerReception, (s) => s.receptions, (s) => s.yacValues),
  ].filter((p): p is { label: string; percentile: number } => p !== null);

  if (parts.length === 0) return { grade: null, ranked: [], diagnostics };
  return {
    grade: Math.round(parts.reduce((a, b) => a + b.percentile, 0) / parts.length),
    ranked: parts.map((p) => p.label),
    diagnostics,
  };
}
