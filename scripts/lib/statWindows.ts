import type { PbpRow } from "./pbp";

export interface StatWindow {
  key: string;
  label: string;
  games: number;
  gameIds: Set<string>;
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
  const gameIds = [
    ...new Set(pbp.filter((r) => r.posteam === team || r.defteam === team).map((r) => r.game_id)),
  ].sort();
  const windows: StatWindow[] = [];
  for (let n = 1; n <= gameIds.length; n++) {
    const slice = gameIds.slice(gameIds.length - n);
    windows.push({
      key: `last-${n}`,
      label: n === 1 ? "Last Game" : `Last ${n} Games`,
      games: n,
      gameIds: new Set(slice),
    });
  }
  return windows;
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
export function buildLastNWeekWindows(pbp: PbpRow[], maxWindows = 18): StatWindow[] {
  const weeks = [...new Set(pbp.map((r) => Number(r.week)).filter((w) => Number.isFinite(w)))].sort(
    (a, b) => a - b
  );
  if (weeks.length === 0) return [];
  const currentWeek = weeks[weeks.length - 1];
  const windows: StatWindow[] = [];
  const n = Math.min(weeks.length, maxWindows);
  for (let i = 1; i <= n; i++) {
    const minWeek = currentWeek - i + 1;
    const gameIds = new Set(
      pbp.filter((r) => Number(r.week) >= minWeek && Number(r.week) <= currentWeek).map((r) => r.game_id)
    );
    windows.push({
      key: `last-${i}-weeks`,
      label: i === 1 ? "Last Week" : `Last ${i} Weeks`,
      games: i,
      gameIds,
    });
  }
  return windows;
}
