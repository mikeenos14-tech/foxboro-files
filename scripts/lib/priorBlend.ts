// Blends a real prior-season number with this season's in-progress number,
// so one or two early games don't single-handedly swing a rating (win
// probability, EPA rank, etc.) to an extreme before there's enough of a
// sample to trust on its own.
//
// Linear taper to zero: the prior's weight falls off a straight line from
// 100% at 0 games played to exactly 0% at the taper's game count, then
// stays at 0% for the rest of the season. Chosen over a smoother
// asymptotic curve (e.g. K/(K+n) "phantom games" shrinkage) specifically
// because that kind of curve never actually reaches zero — even a full
// 17-game season would still be a few percent prior-influenced. A hard,
// explainable endpoint was worth more here than a curve that's
// technically never finished.
//
// PHASE_OUT_GAMES = 4 (revised down from 8 after real-world feedback: at
// 8, two games in still meant 75% weight on last year's team, and a
// year-over-year roster/scheme turnover is real enough that leaning that
// hard on 2025 was overriding what 2026 actually looked like — the
// original 8-game figure was chosen to match general EPA-stabilization
// research, but that research is about within-season sample stability,
// not about how much a DIFFERENT season's roster should still count for.
// At 4, two games in is a 50/50 split, and the blend is fully
// current-season by Week 5).
export const PHASE_OUT_GAMES = 4;

// A separate, independently-tunable taper for the opponent-baseline
// shrinkage in leagueRanks.ts/adjustedRate.ts (an opponent's own
// leave-one-out baseline regressed toward the CURRENT-SEASON league
// average — a same-season small-sample correction, not a blend with last
// year's data). Deliberately NOT the same constant as PHASE_OUT_GAMES:
// that fix's own game count (an opponent's games so far this year) is a
// different axis than "how much should 2025 still count," and changing
// one shouldn't silently change the other.
export const OPPONENT_BASELINE_SHRINK_GAMES = 8;

export function blendWithPrior(
  prior: number,
  current: number,
  gamesPlayed: number,
  phaseOutGames: number = PHASE_OUT_GAMES
): number {
  const priorWeight = Math.max(0, 1 - gamesPlayed / phaseOutGames);
  return prior * priorWeight + current * (1 - priorWeight);
}
