import type { Game } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";

export function CountdownCard({ game }: { game: Game }) {
  const opponent = game.homeTeam === "NE" ? game.awayTeam : game.homeTeam;
  const location = game.homeTeam === "NE" ? "Home" : "Away";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="text-sm font-medium text-muted">Next Game</span>
      <div className="mt-1 text-2xl font-bold text-navy">vs. {opponent}</div>
      <p className="mt-1 text-sm text-muted">
        {formatDate(game.date)} · {location} · {game.venue}
      </p>
    </div>
  );
}
