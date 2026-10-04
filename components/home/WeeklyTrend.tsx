import type { Game, GameRecap } from "@/lib/data/types";
import { opponentLabel, signed } from "@/lib/util/format";
import { WeeklyTrendChart, type WeeklyTrendPoint } from "./WeeklyTrendChart";

// "Are we getting better?" — EPA/play game by game. Hidden until there
// are two games: one point isn't a trend.
export function WeeklyTrend({ recaps }: { recaps: Array<{ game: Game; recap: GameRecap }> }) {
  const points: WeeklyTrendPoint[] = [...recaps]
    .sort((a, b) => a.game.week - b.game.week)
    .map(({ game, recap }) => {
      const isHome = game.homeTeam === "NE";
      const us = isHome ? game.homeScore : game.awayScore;
      const them = isHome ? game.awayScore : game.homeScore;
      const result = us === undefined || them === undefined ? "" : ` · ${us > them ? "W" : us < them ? "L" : "T"} ${us}-${them}`;
      return {
        gameId: game.id,
        week: game.week,
        game: `${opponentLabel(isHome ? game.awayTeam : game.homeTeam, isHome)}${result}`,
        offense: recap.epaPerPlay.offense,
        defense: recap.epaPerPlay.defense,
      };
    });
  if (points.length < 2) return null;

  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">Week by Week</h2>
      <p className="mt-1 text-sm text-muted">
        EPA per play in each game. Offense wants to be above the line, defense below it. Single
        games are noisy (and not adjusted for the opponent), so look for the direction, not one
        point. Tap a point to open that game&apos;s recap.
      </p>
      <div className="mt-3">
        <WeeklyTrendChart points={points} />
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">Game by game numbers</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 text-left font-medium">Game</th>
              <th className="py-1 text-right font-medium">Offense</th>
              <th className="py-1 text-right font-medium">Defense allowed</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.week} className="border-t border-border">
                <td className="py-1">
                  Wk {p.week} {p.game}
                </td>
                <td className="py-1 text-right">{signed(p.offense, 2)}</td>
                <td className="py-1 text-right">{signed(p.defense, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
