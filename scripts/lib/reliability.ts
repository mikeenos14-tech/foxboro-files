// Is a league ranking of this metric measuring anything yet?
//
// Shrinkage is not enough on its own. Shrinking every team toward the
// league mean protects against one small-sample team outranking a
// well-measured one — but when the WHOLE league is small-sample, every
// team gets pulled by roughly the same weight, the ordering survives
// almost intact, and the ranking still looks authoritative while being
// built entirely out of noise. Shrinkage fixes unfair comparisons; it
// does not manufacture signal that isn't there.
//
// The test that does catch it: compare the spread we actually observe
// between teams against the spread that random chance alone would
// produce at these sample sizes. If teams differ by no more than
// coin-flipping would explain, there is nothing to rank.
//
// This is the standard one-way intraclass correlation. Worked example
// from the case that prompted this file — WR catch rate on catchable
// balls, two games into 2026:
//
//   observed variance between teams  0.00227
//   variance from chance alone       0.00402   <- larger
//   reliability                      0.00
//
// The league ranged from 80% to 100% and looked like a real ladder. It
// wasn't one. New England sat 3rd; flipping a single drop moved them to
// 16th, and three drops to 29th. A rank that one play can move thirteen
// places is not a measurement, and publishing it next to a real grade
// implies a precision the data cannot support.

export interface ReliabilityResult {
  /** Share of observed between-team spread that is real, 0–1. */
  reliability: number;
  /** Variance between team means, weighted by sample size. */
  observedVar: number;
  /** Variance attributable to sampling noise at these n. */
  noiseVar: number;
  /** Variance of a SINGLE observation around its own team's mean. */
  withinVar: number;
  /**
   * Estimated real spread in team talent: observed minus noise. Floors
   * at 0 — a negative estimate means the data shows no team differences
   * at all, not a negative amount of them.
   */
  trueVar: number;
  grandMean: number;
  /** Total observations across all teams. */
  n: number;
}

// Each group is one team's raw per-play observations: 1/0 for a rate
// (caught / not caught), or the actual value for a mean (yards after
// catch on each reception). Taking raw observations rather than
// pre-computed rates is what lets this measure within-team variance,
// which is the whole basis of the noise estimate.
export function reliability(groups: number[][]): ReliabilityResult {
  const valid = groups.filter((g) => g.length > 0);
  const n = valid.reduce((a, g) => a + g.length, 0);
  if (n === 0 || valid.length < 2) {
    return { reliability: 0, observedVar: 0, noiseVar: 0, withinVar: 0, trueVar: 0, grandMean: 0, n };
  }

  const grandMean = valid.reduce((a, g) => a + g.reduce((x, y) => x + y, 0), 0) / n;

  const means = valid.map((g) => g.reduce((a, b) => a + b, 0) / g.length);

  // Spread between team means, weighted by how much data each team has.
  const observedVar =
    valid.reduce((a, g, i) => a + g.length * (means[i] - grandMean) ** 2, 0) / n;

  // Pooled within-team variance: how much a single play varies around
  // its own team's mean. This is the raw material of the noise estimate.
  const withinSs = valid.reduce(
    (a, g, i) => a + g.reduce((x, v) => x + (v - means[i]) ** 2, 0),
    0
  );
  const withinDf = n - valid.length;
  const withinVar = withinDf > 0 ? withinSs / withinDf : 0;

  // A team mean over n plays carries noise withinVar/n. Weighted the
  // same way as observedVar so the two are comparable.
  const noiseVar = valid.reduce((a, g) => a + g.length * (withinVar / g.length), 0) / n;

  const trueVar = Math.max(0, observedVar - noiseVar);
  if (observedVar <= 0) {
    return { reliability: 0, observedVar, noiseVar, withinVar, trueVar, grandMean, n };
  }
  return {
    reliability: Math.max(0, 1 - noiseVar / observedVar),
    observedVar,
    noiseVar,
    withinVar,
    trueVar,
    grandMean,
    n,
  };
}

// Two thresholds, not one, because a single cutoff makes the rank blink
// on and off week to week.
//
// Reliability is itself an estimate from ~32 team means, so it carries
// roughly 25% relative error and wobbles by ±0.06 between weeks even as
// the underlying sample grows. Replaying the real 2025 season through a
// single 0.5 cutoff, WR catch rate opened at Week 8 (0.50), closed at
// Week 10 (0.49), stayed closed at Week 12 (0.44), then reopened at
// Week 14 (0.55). A league rank that appears, vanishes, and reappears
// is worse than either showing it or not.
//
// So: clear the higher bar to start ranking, and fall below the lower
// bar to stop. Within a season the gate only opens once — see
// resolveGate, which carries the decision forward.
export const OPEN_RELIABILITY = 0.55;
export const KEEP_RELIABILITY = 0.4;

/** Back-compat alias for the opening bar. */
export const MIN_RELIABILITY = OPEN_RELIABILITY;

export interface GateState {
  /** Whether this metric was already being ranked. */
  open: boolean;
}

// Hysteresis. `was` is the gate's state from the previous build; pass
// undefined on the first build of a season.
export function resolveGate(groups: number[][], was?: GateState): GateState & { reliability: number } {
  const r = reliability(groups).reliability;
  const open = was?.open ? r >= KEEP_RELIABILITY : r >= OPEN_RELIABILITY;
  return { open, reliability: r };
}

export function isRankable(groups: number[][], was?: GateState): boolean {
  return resolveGate(groups, was).open;
}

// The shrinkage constant K, derived rather than guessed.
//
// Shrinking by w = n/(n+K) is the optimal (empirical-Bayes) estimator
// when K is the ratio of play-to-play noise to real spread in team
// talent:
//
//   K = withinVar / trueVar
//
// Read plainly: K is how many plays it takes for the signal to
// outweigh the noise. A metric where teams differ a lot relative to
// play-to-play variance gets a small K and is trusted quickly. A metric
// where teams barely differ gets a large K and stays regressed — which
// is correct, not conservative, because there genuinely isn't much
// there to measure.
//
// This matters most for the question "do the small-sample safeguards
// ever let go?" A hand-picked K answers that arbitrarily. A derived K
// answers it with the data: the pull that remains at full season is
// exactly the pull the metric's own signal-to-noise justifies.
//
// Returns null when trueVar is 0 — no measurable spread, so no finite K
// is right and the caller should not be ranking this metric at all.
export function calibrateK(groups: number[][]): number | null {
  const r = reliability(groups);
  if (r.trueVar <= 0 || r.withinVar <= 0) return null;
  return r.withinVar / r.trueVar;
}
