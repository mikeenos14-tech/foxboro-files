// Frozen reference: each team's full-season offensive and defensive
// EPA/play from the 2025 season, computed from real nflverse play-by-play
// data via scripts/compute-prior-strength.ts. Used as the "preseason prior"
// blended with the current season's in-progress EPA (see
// scripts/lib/priorBlend.ts) so one or two early games don't single-handedly
// swing win probabilities or EPA rankings.
//
// Regenerate at the start of each new season, once the prior season is
// final: npx tsx scripts/compute-prior-strength.ts <season>
export const PRIOR_SEASON = 2025;

export const PRIOR_OFFENSE_EPA: Record<string, number> = {
  BUF: 0.1355,
  MIA: -0.0168,
  NE: 0.1592,
  NYJ: -0.1265,
  BAL: 0.034,
  CIN: -0.0085,
  CLE: -0.1902,
  PIT: 0.0262,
  HOU: -0.0129,
  IND: 0.0721,
  JAX: 0.0315,
  TEN: -0.1597,
  DEN: 0.0497,
  KC: 0.0349,
  LV: -0.2154,
  LAC: -0.0235,
  DAL: 0.0978,
  NYG: 0.0123,
  PHI: 0.0258,
  WAS: 0.0065,
  CHI: 0.0795,
  DET: 0.0822,
  GB: 0.1149,
  MIN: -0.1155,
  ATL: -0.0214,
  CAR: -0.0393,
  NO: -0.0881,
  TB: -0.0089,
  ARI: -0.0185,
  LA: 0.1448,
  SF: 0.088,
  SEA: 0.0328,
};

export const PRIOR_DEFENSE_EPA: Record<string, number> = {
  BUF: -0.0163,
  MIA: 0.0882,
  NE: -0.0471,
  NYJ: 0.1472,
  BAL: 0.0251,
  CIN: 0.1298,
  CLE: -0.0958,
  PIT: 0.0177,
  HOU: -0.1314,
  IND: 0.0043,
  JAX: -0.1054,
  TEN: 0.1013,
  DEN: -0.0879,
  KC: -0.0192,
  LV: 0.0243,
  LAC: -0.083,
  DAL: 0.1674,
  NYG: 0.0874,
  PHI: -0.079,
  WAS: 0.1433,
  CHI: 0.0181,
  DET: -0.0099,
  GB: 0.0342,
  MIN: -0.0995,
  ATL: -0.0037,
  CAR: 0.0673,
  NO: -0.0591,
  TB: 0.0133,
  ARI: 0.0884,
  LA: -0.0609,
  SF: 0.0704,
  SEA: -0.1159,
};
