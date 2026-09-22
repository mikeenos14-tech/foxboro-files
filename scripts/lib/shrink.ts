// Small-sample shrinkage for per-play rate metrics (EPA/play, sack rate,
// etc.) computed over a team's own plays.
//
// Why this exists: the position-group grades were percentile ranks
// computed on raw per-play averages with no sample-size treatment at all.
// Measured against real Week-2 data, that meant the TE grade came off a
// median of 12 targets per team (minimum 5), and the league-wide raw
// spread at TE was 2.42 EPA/play — from +1.32 to -1.10. Values like that
// aren't talent, they're a handful of targets and one touchdown, and the
// site rendered them as a precise percentile with a colored bar.
//
// The session that built the grades had already identified this exact
// problem one level up and fixed it for opponent baselines (see
// leagueRanks.ts). The same argument applies with more force to a
// 10-target sample, so the same medicine belongs here.
//
// Method: standard James-Stein-style shrinkage toward the league mean,
// weight = n / (n + K). K is the "how many plays before we half-trust the
// raw number" constant — at n = K the estimate sits halfway between the
// team's raw value and the league mean. K is per-metric because a target
// carries far more variance than a rushing attempt.
//
// This deliberately does NOT reach zero influence: unlike the
// prior-season blend (priorBlend.ts), there's no point in the season
// where a 12-target sample becomes trustworthy on its own, so an
// asymptotic curve is the right shape here.

export interface ShrinkableSample {
  value: number;
  n: number;
}

// Plays before the raw value gets 50% of the weight. Set from the
// observed per-play variance of each metric: receiving EPA swings hardest
// (a single 40-yard TD moves a 10-target average by ~0.5 EPA/play), rush
// attempts are the most stable, dropback-rate stats sit in between.
export const SHRINK_K = {
  receivingEpa: 40,
  rushingEpa: 30,
  passingEpa: 40,
  teamRate: 50,
} as const;

// Plays-weighted league mean — the shrinkage target. Weighted rather than
// a mean-of-means so a team with 5 targets doesn't pull the league
// average as hard as a team with 50.
export function leagueMean(samples: ShrinkableSample[]): number {
  let weighted = 0;
  let plays = 0;
  for (const s of samples) {
    weighted += s.value * s.n;
    plays += s.n;
  }
  return plays === 0 ? 0 : weighted / plays;
}

export function shrink(sample: ShrinkableSample, mean: number, k: number): number {
  if (sample.n === 0) return mean;
  const weight = sample.n / (sample.n + k);
  return sample.value * weight + mean * (1 - weight);
}

// How much of the displayed number is actually the team's own play, as a
// 0-1 fraction — surfaced in the UI so a grade built on 10 targets can
// say so instead of presenting itself with the same confidence as one
// built on 300.
export function sampleConfidence(n: number, k: number): number {
  return n / (n + k);
}

export type ConfidenceLabel = "low" | "medium" | "high";

export function confidenceLabel(n: number, k: number): ConfidenceLabel {
  const c = sampleConfidence(n, k);
  if (c < 0.35) return "low";
  if (c < 0.6) return "medium";
  return "high";
}
