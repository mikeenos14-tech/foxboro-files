import Link from "next/link";
import type { Game } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";
import { TeamLogo } from "@/components/shared/TeamLogo";

export function GameResultCard({ game }: { game: Game }) {
  const isHome = game.homeTeam === "NE";
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const usScore = isHome ? game.homeScore : game.awayScore;
  const themScore = isHome ? game.awayScore : game.homeScore;
  const won = (usScore ?? 0) > (themScore ?? 0);

  return (
    <Link
      href={`/recap/${game.id}`}
      className="block rounded-lg bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/15"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">Last Game</span>
        <TeamLogo team={opponent} size={22} onDark />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`font-display text-4xl font-bold ${won ? "text-rank-good" : "text-red-light"}`}
        >
          {won ? "W" : "L"}
        </span>
        <span className="font-display text-4xl font-bold text-white">
          {usScore}-{themScore}
        </span>
        <span className="text-sm text-white/70">vs. {opponent}</span>
      </div>
      <p className="mt-1 text-sm text-white/70">
        {formatDate(game.date)} · Full recap →
      </p>
    </Link>
  );
}
