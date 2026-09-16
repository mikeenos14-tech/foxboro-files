// Frozen reference: each team's full-season net EPA/play (offense minus
// defense) from the 2025 season, computed from real nflverse play-by-play
// data via scripts/compute-prior-strength.ts. Used as the "preseason prior"
// in build-data.ts's win-probability model, blended with the current
// season's in-progress EPA via games-played shrinkage so one or two early
// games don't single-handedly swing every remaining game's odds — see the
// blend in build-data.ts for how the weighting works.
//
// Regenerate at the start of each new season, once the prior season is
// final: npx tsx scripts/compute-prior-strength.ts <season>
export const PRIOR_SEASON = 2025;

export const PRIOR_NET_EPA: Record<string, number> = {
  BUF: 0.1518,
  MIA: -0.105,
  NE: 0.2063,
  NYJ: -0.2737,
  BAL: 0.0089,
  CIN: -0.1383,
  CLE: -0.0944,
  PIT: 0.0085,
  HOU: 0.1185,
  IND: 0.0679,
  JAX: 0.1368,
  TEN: -0.261,
  DEN: 0.1376,
  KC: 0.054,
  LV: -0.2396,
  LAC: 0.0595,
  DAL: -0.0696,
  NYG: -0.0751,
  PHI: 0.1048,
  WAS: -0.1369,
  CHI: 0.0614,
  DET: 0.0921,
  GB: 0.0807,
  MIN: -0.016,
  ATL: -0.0176,
  CAR: -0.1066,
  NO: -0.029,
  TB: -0.0222,
  ARI: -0.1069,
  LA: 0.2057,
  SF: 0.0175,
  SEA: 0.1487,
};
