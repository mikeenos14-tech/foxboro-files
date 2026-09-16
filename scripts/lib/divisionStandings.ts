import { num } from "./csv";
import { pointDiff, type TeamRecord } from "./standings";
import type { DivisionStanding } from "../../lib/data/types";

type GameRow = Record<string, string>;

function teamGamesThisSeason(games: GameRow[], season: number, t: string): GameRow[] {
  return games
    .filter(
      (g) =>
        num(g.season) === season &&
        g.game_type === "REG" &&
        (g.home_team === t || g.away_team === t) &&
        g.home_score !== "" &&
        g.home_score !== undefined
    )
    .sort((a, b) => num(a.week) - num(b.week));
}

function resultFor(g: GameRow, t: string): "W" | "L" | "T" {
  const isHome = g.home_team === t;
  const own = num(isHome ? g.home_score : g.away_score);
  const opp = num(isHome ? g.away_score : g.home_score);
  return own > opp ? "W" : own < opp ? "L" : "T";
}

// Real per-team record, streak, division record, and point differential
// for one division — shared by the Home page's own-division card and the
// Around the League page's all-8-divisions view, so both stay identical
// in methodology. Sort is win% then point differential — a reasonable
// simplified ordering, not the NFL's full official tiebreaker chain
// (head-to-head, common games, conference record, etc.), which is out of
// scope here.
export function computeDivisionStandings(
  games: GameRow[],
  season: number,
  divisionTeams: string[],
  standings: Map<string, TeamRecord>,
  highlightTeam?: string
): DivisionStanding[] {
  return divisionTeams
    .map((t) => {
      const r = standings.get(t);
      const teamGames = teamGamesThisSeason(games, season, t);
      const results = teamGames.map((g) => resultFor(g, t));
      const last = results[results.length - 1];
      const streak =
        results.length === 0
          ? null
          : {
              result: last,
              count: (() => {
                let count = 0;
                for (let i = results.length - 1; i >= 0 && results[i] === last; i--) count++;
                return count;
              })(),
            };

      const divGames = teamGames.filter((g) => {
        const opp = g.home_team === t ? g.away_team : g.home_team;
        return opp !== t && divisionTeams.includes(opp);
      });
      const divisionRecord = { wins: 0, losses: 0, ties: 0 };
      for (const g of divGames) {
        const res = resultFor(g, t);
        if (res === "W") divisionRecord.wins++;
        else if (res === "L") divisionRecord.losses++;
        else divisionRecord.ties++;
      }

      return {
        team: t,
        wins: r?.wins ?? 0,
        losses: r?.losses ?? 0,
        ties: r?.ties ?? 0,
        pointDifferential: pointDiff(r),
        isUs: t === highlightTeam,
        streak,
        divisionRecord,
      };
    })
    .sort((a, b) => {
      const aGames = a.wins + a.losses + a.ties;
      const bGames = b.wins + b.losses + b.ties;
      const aPct = aGames === 0 ? 0 : (a.wins + a.ties * 0.5) / aGames;
      const bPct = bGames === 0 ? 0 : (b.wins + b.ties * 0.5) / bGames;
      if (bPct !== aPct) return bPct - aPct;
      return b.pointDifferential - a.pointDifferential;
    });
}
