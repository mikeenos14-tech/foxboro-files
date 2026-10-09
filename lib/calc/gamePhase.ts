import { kickoffIso } from "@/lib/util/format";

// Where the week is, from the reader's point of view, so the home page's
// top card can change with it:
//   upcoming  — the next game is on a later day
//   gameday   — it's today (Eastern calendar day), not started
//   live      — kicked off within the last 3.5 hours; the site isn't
//               live-scoring, so the card says where to watch instead
//   awaiting  — the game's over but the data hasn't caught up yet
//   postgame  — the last game's result is in and it ended within the last
//               day and a half: lead with the result and what stood out
export type GamePhase = "upcoming" | "gameday" | "live" | "awaiting" | "postgame";

const HOUR = 3_600_000;
export const GAME_LENGTH_HOURS = 3.5;
export const POSTGAME_HOURS = 36;

const etDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export function gamePhase(
  now: Date,
  next: { date: string; kickoffTimeEt?: string } | null,
  last: { date: string; kickoffTimeEt?: string; hasResult: boolean } | null
): GamePhase {
  if (next) {
    const kickoff = new Date(kickoffIso(next.date, next.kickoffTimeEt)).getTime();
    const since = now.getTime() - kickoff;
    if (since >= 0) return since < GAME_LENGTH_HOURS * HOUR ? "live" : "awaiting";
  }
  if (last?.hasResult) {
    const lastKickoff = new Date(kickoffIso(last.date, last.kickoffTimeEt)).getTime();
    if (now.getTime() - lastKickoff < POSTGAME_HOURS * HOUR) return "postgame";
  }
  if (next && etDate(now) === next.date) return "gameday";
  return "upcoming";
}
