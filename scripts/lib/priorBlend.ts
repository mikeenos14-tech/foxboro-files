// Blends a real prior-season number with this season's in-progress number,
// so one or two early games don't single-handedly swing a rating (win
// probability, EPA rank, etc.) to an extreme before there's enough of a
// sample to trust on its own.
//
// Linear taper to zero: the prior's weight falls off a straight line from
// 100% at 0 games played to exactly 0% at PHASE_OUT_GAMES, then stays at
// 0% for the rest of the season. Chosen over a smoother asymptotic curve
// (e.g. K/(K+n) "phantom games" shrinkage) specifically because that kind
// of curve never actually reaches zero — even a full 17-game season would
// still be a few percent prior-influenced. A hard, explainable endpoint
// ("by game 8, this is 100% real current-season data") was worth more
// here than a curve that's technically never finished.
//
// 8 games (roughly the halfway point of a 17-game season) is chosen to
// match published research on EPA-based team-rating stabilization — team
// offense/defense EPA's correlation with rest-of-season performance climbs
// substantially by around 6-8 games — and how real analytics outlets
// (e.g. Football Outsiders' weighted DVOA) fully transition off the prior
// season by roughly mid-season.
export const PHASE_OUT_GAMES = 8;

export function blendWithPrior(prior: number, current: number, gamesPlayed: number): number {
  const priorWeight = Math.max(0, 1 - gamesPlayed / PHASE_OUT_GAMES);
  return prior * priorWeight + current * (1 - priorWeight);
}
