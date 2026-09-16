import type { LeagueScoreboardGame } from "@/lib/data/types";
import { TeamLogo } from "@/components/shared/TeamLogo";

function GameCard({ game }: { game: LeagueScoreboardGame }) {
  const homeWon = game.homeScore > game.awayScore;
  const awayWon = game.awayScore > game.homeScore;
  return (
    <div className="lift rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TeamLogo team={game.awayTeam} size={20} />
          <span className={`text-sm ${awayWon ? "font-bold text-foreground" : "text-muted"}`}>
            {game.awayTeam}
          </span>
          <span className="text-xs text-muted">{game.awayRecord}</span>
        </div>
        <span className={`text-sm ${awayWon ? "font-bold text-foreground" : "text-muted"}`}>
          {game.awayScore}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TeamLogo team={game.homeTeam} size={20} />
          <span className={`text-sm ${homeWon ? "font-bold text-foreground" : "text-muted"}`}>
            {game.homeTeam}
          </span>
          <span className="text-xs text-muted">{game.homeRecord}</span>
        </div>
        <span className={`text-sm ${homeWon ? "font-bold text-foreground" : "text-muted"}`}>
          {game.homeScore}
        </span>
      </div>
      {game.overtime && <p className="mt-1.5 text-xs text-muted">Final/OT</p>}
    </div>
  );
}

export function LastWeekScores({ games }: { games: LeagueScoreboardGame[] }) {
  if (games.length === 0) {
    return <p className="text-sm text-muted">No games completed yet this season.</p>;
  }

  const week = games[0].week;
  const byDay = new Map<string, LeagueScoreboardGame[]>();
  for (const g of games) {
    if (!byDay.has(g.weekday)) byDay.set(g.weekday, []);
    byDay.get(g.weekday)!.push(g);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Week {week} final scores, around the league.</p>
      {[...byDay.entries()].map(([day, dayGames]) => (
        <div key={day}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{day}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dayGames.map((g) => (
              <GameCard key={g.gameId} game={g} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
