// Win-probability estimation for unplayed games.
//
// Extracted from build-data.ts so it can be tested directly — this is
// exactly the kind of pure numeric code where a silent sign flip or a
// bad constant produces plausible-looking output that nothing catches.

export const WIN_PROB_FLOOR = 0.1;
export const WIN_PROB_CEILING = 0.9;

// Historical standard deviation of NFL scoring margin. The standard
// constant for converting a point spread into a win probability.
export const MARGIN_SD = 13.86;

function clamp(p: number): number {
  return Math.min(WIN_PROB_CEILING, Math.max(WIN_PROB_FLOOR, p));
}

// Rough heuristic, explicitly not a real predictive model: maps EPA/play
// differential through a bounded curve, plus a small home-field bump.
// Scale factor kept modest so early-season, small-sample EPA gaps don't
// saturate the estimate to the clamp floor/ceiling on nearly every game.
export function simpleWinProb(netEpaDiff: number, isHome: boolean): number {
  const scaled = Math.tanh(netEpaDiff * 2.5);
  const base = 0.5 + 0.5 * scaled;
  const homeBump = isHome ? 0.025 : -0.025;
  return clamp(base + homeBump);
}

// Standard normal CDF (Abramowitz & Stegun 7.1.26 approximation).
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// `ourSpread` follows the convention used throughout this codebase:
// positive means we're getting points (underdog), negative means favored.
export function winProbFromSpread(ourSpread: number): number {
  return normalCdf(-ourSpread / MARGIN_SD);
}

// Blended 50/50 rather than replacing the model outright. A real market
// line is the better estimate — it prices injuries, matchups and weather
// the EPA model knows nothing about — but the site's framing is that its
// numbers come from real play data and the betting line is public
// perception, so this keeps both in the estimate rather than quietly
// becoming a Vegas mirror.
export function blendedWinProb(epaEstimate: number, ourSpread: number | undefined): number {
  if (ourSpread === undefined) return epaEstimate;
  return clamp(epaEstimate * 0.5 + winProbFromSpread(ourSpread) * 0.5);
}
