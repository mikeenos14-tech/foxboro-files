import type { PbpRow } from "./pbp";

export interface StatWindow {
  key: string;
  label: string;
  games: number;
  gameIds: Set<string>;
  // Week numbers covered, for callers that work off the schedule rather
  // than play-by-play (point differential comes from final scores, not
  // plays). Only populated by the week-based builder.
  weeks?: Set<number>;
}

// The recent-form windows the site offers, and the only ones it offers.
//
// These used to be every N from 1 up to games played, which meant the
// dropdown grew all season: two entries in Week 2, nineteen by Week 17,
// almost all of them ("Last 13 Games") things nobody wants. The filter
// exists as a gut check on recent form, and a gut check is last game /
// last three / last five — the same splits ESPN, PFF and every fantasy
// tool settle on, because they're what people actually reason in.
export const RECENT_WINDOW_SIZES = [1, 3, 5] as const;

// A window is only offered once it says something the full-season view
// doesn't: at exactly 3 games played, "Last 3 Games" IS the season, so
// offering both is just two names for one number.
function offeredSizes(total: number): number[] {
  return RECENT_WINDOW_SIZES.filter((n) => n < total);
}

// Every "last N games" window for a team, N = 1 up to however many games
// they've played so far this season. Game IDs are nflverse's own
// YYYY_WW_AWAY_HOME strings, zero-padded on week, so a plain string sort
// is already chronological within one season — no separate date field
// needed. These are RAW (not opponent-adjusted) windows: a 1-3 game slice
// is too thin a sample for the leave-one-out opponent-adjustment method
// (see leagueRanks.ts/adjustedRate.ts) to produce a reliable baseline, so
// windowed views intentionally show raw per-window numbers instead,
// distinct from the full-season default view (which stays opponent-
// adjusted as before).
export function buildLastNGameWindows(pbp: PbpRow[], team: string): StatWindow[] {
  const gameIds = teamGameIds(pbp, team);
  return offeredSizes(gameIds.length).map((n) => gameWindow(gameIds, n));
}

function teamGameIds(pbp: PbpRow[], team: string): string[] {
  return [
    ...new Set(pbp.filter((r) => r.posteam === team || r.defteam === team).map((r) => r.game_id)),
  ].sort();
}

function gameWindow(gameIds: string[], n: number): StatWindow {
  const size = Math.min(n, gameIds.length);
  return {
    key: `last-${n}`,
    label: n === 1 ? "Last Game" : `Last ${n} Games`,
    games: size,
    gameIds: new Set(gameIds.slice(gameIds.length - size)),
  };
}

// The same window for any team, clamped to the games that team has
// actually played.
//
// Used to build the league baseline a windowed grade is ranked against.
// It's resolved by SIZE rather than by position in a list, because teams
// don't all have the same number of games once byes start: looking up
// "the third window" would silently compare our last five games against
// someone else's last three.
export function gameWindowForSize(pbp: PbpRow[], team: string, n: number): StatWindow | null {
  const gameIds = teamGameIds(pbp, team);
  if (gameIds.length === 0) return null;
  return gameWindow(gameIds, n);
}

export function filterRowsToWindow(rows: PbpRow[], window: StatWindow): PbpRow[] {
  return rows.filter((r) => window.gameIds.has(r.game_id));
}

// League-wide "last N weeks" windows, calendar-based rather than per-team
// game count. Unlike buildLastNGameWindows (single-team, no cross-team
// math involved), a multi-team opponent-adjusted computation (see
// leagueRanks.ts/adjustedRate.ts) needs every team's window to line up on
// the same games so an opponent's own "other games" baseline is drawn
// from that same window too — a per-team "last N games" slice would let
// two teams' windows disagree about which games are even in scope (byes
// shift the count), breaking that baseline. Weeks give every team the
// same window by construction; a team on a bye during one of those weeks
// just has fewer actual games in it, which is correct, not a bug.
export function buildLastNWeekWindows(pbp: PbpRow[]): StatWindow[] {
  const weeks = [...new Set(pbp.map((r) => Number(r.week)).filter((w) => Number.isFinite(w)))].sort(
    (a, b) => a - b
  );
  if (weeks.length === 0) return [];
  const currentWeek = weeks[weeks.length - 1];
  const windows: StatWindow[] = [];
  for (const i of offeredSizes(weeks.length)) {
    const minWeek = currentWeek - i + 1;
    const gameIds = new Set(
      pbp.filter((r) => Number(r.week) >= minWeek && Number(r.week) <= currentWeek).map((r) => r.game_id)
    );
    const weekNumbers = new Set<number>();
    for (let w = minWeek; w <= currentWeek; w++) weekNumbers.add(w);
    windows.push({
      key: `last-${i}-weeks`,
      label: i === 1 ? "Last Week" : `Last ${i} Weeks`,
      games: i,
      gameIds,
      weeks: weekNumbers,
    });
  }
  return windows;
}
