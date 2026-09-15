import type { Game } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";
import { TeamLogo } from "@/components/shared/TeamLogo";

export function BoxScoreSummary({ game }: { game: Game }) {
  const isHome = game.homeTeam === "NE";
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const usScore = isHome ? game.homeScore : game.awayScore;
  const themScore = isHome ? game.awayScore : game.homeScore;
  const won = (usScore ?? 0) > (themScore ?? 0);

  return (
    <div className="-mx-4 hero-texture bg-gradient-to-br from-navy via-navy to-navy-deep px-4 py-8 text-center sm:mx-0 sm:rounded-xl sm:px-6">
      <p className="text-sm text-white/70">
        {formatDate(game.date)} · {game.venue}
        {game.network ? ` · ${game.network}` : ""}
      </p>
      <div className="mt-3 flex items-center justify-center gap-4">
        <span
          className={`font-display text-2xl font-bold uppercase tracking-widest ${
            won ? "text-rank-good" : "text-red-light"
          }`}
        >
          {won ? "Win" : "Loss"}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-4 font-display text-6xl font-bold text-white sm:text-8xl">
        <TeamLogo team="NE" size={64} onDark />
        <span>
          {usScore}
          <span className="mx-2 text-silver">–</span>
          {themScore}
        </span>
        <TeamLogo team={opponent} size={64} onDark />
      </div>
      <p className="mt-2 text-lg text-white/70">vs. {opponent}</p>
    </div>
  );
}
