import type { Game } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";
import { TeamLogo } from "@/components/shared/TeamLogo";

export function CountdownCard({ game }: { game: Game }) {
  const opponent = game.homeTeam === "NE" ? game.awayTeam : game.homeTeam;
  const location = game.homeTeam === "NE" ? "Home" : "Away";

  return (
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">Next Game</span>
        <TeamLogo team={opponent} size={22} onDark />
      </div>
      <div className="mt-1 font-display text-4xl font-bold text-white">
        vs. {opponent}
      </div>
      <p className="mt-1 text-sm text-white/70">
        {formatDate(game.date)} · {location} · {game.venue}
      </p>
    </div>
  );
}
