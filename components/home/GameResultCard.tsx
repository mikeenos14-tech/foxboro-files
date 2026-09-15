import Link from "next/link";
import type { Game } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";

export function GameResultCard({ game }: { game: Game }) {
  const isHome = game.homeTeam === "NE";
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const usScore = isHome ? game.homeScore : game.awayScore;
  const themScore = isHome ? game.awayScore : game.homeScore;
  const won = (usScore ?? 0) > (themScore ?? 0);

  return (
    <Link
      href={`/recap/${game.id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition hover:border-navy/30"
    >
      <span className="text-sm font-medium text-muted">Last Game</span>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold ${won ? "text-rank-good" : "text-rank-bad"}`}
        >
          {won ? "W" : "L"}
        </span>
        <span className="text-2xl font-bold text-navy">
          {usScore}-{themScore}
        </span>
        <span className="text-sm text-muted">vs. {opponent}</span>
      </div>
      <p className="mt-1 text-sm text-muted">{formatDate(game.date)} · Full recap →</p>
    </Link>
  );
}
