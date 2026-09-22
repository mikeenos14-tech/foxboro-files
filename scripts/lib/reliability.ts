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
    return { reliability: 0, observedVar: 0, noiseVar: 0, grandMean: 0, n };
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

  if (observedVar <= 0) {
    return { reliability: 0, observedVar, noiseVar, grandMean, n };
  }
  return {
    reliability: Math.max(0, 1 - noiseVar / observedVar),
    observedVar,
    noiseVar,
    grandMean,
    n,
  };
}

// Below this, the ranking is mostly noise and we report raw counts
// instead of a percentile. 0.5 = at least half the visible spread
// between teams is real. Deliberately strict: the cost of showing
// nothing is a fan seeing "not enough data yet", which is true and
// understandable; the cost of showing a bad rank is telling them their
// receivers are 3rd in the league when they're 16th.
export const MIN_RELIABILITY = 0.5;

export function isRankable(groups: number[][]): boolean {
  return reliability(groups).reliability >= MIN_RELIABILITY;
}
