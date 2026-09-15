import type { Game } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";

export function BoxScoreSummary({ game }: { game: Game }) {
  const isHome = game.homeTeam === "NE";
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const usScore = isHome ? game.homeScore : game.awayScore;
  const themScore = isHome ? game.awayScore : game.homeScore;
  const won = (usScore ?? 0) > (themScore ?? 0);

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p className="text-sm text-muted">
        {formatDate(game.date)} · {game.venue}
        {game.network ? ` · ${game.network}` : ""}
      </p>
      <div className="mt-2 flex items-baseline gap-3">
        <span
          className={`text-4xl font-extrabold ${won ? "text-rank-good" : "text-rank-bad"}`}
        >
          {won ? "WIN" : "LOSS"}
        </span>
        <span className="text-4xl font-extrabold text-navy">
          {usScore}-{themScore}
        </span>
        <span className="text-lg text-muted">vs. {opponent}</span>
      </div>
    </div>
  );
}
