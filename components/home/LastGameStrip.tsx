import Link from "next/link";
import type { Game } from "@/lib/data/types";
import { formatDate, opponentLabel } from "@/lib/util/format";
import { TeamLogo } from "@/components/shared/TeamLogo";

// The last result, as one line beside the Next Up strip.
export function LastGameStrip({ game }: { game: Game }) {
  const isHome = game.homeTeam === "NE";
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const us = isHome ? game.homeScore : game.awayScore;
  const them = isHome ? game.awayScore : game.homeScore;
  if (us === undefined || them === undefined) return null;
  const won = us > them;
  return (
    <Link
      href={`/recap/${game.id}`}
      className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 backdrop-blur-sm transition hover:bg-white/15"
    >
      <TeamLogo team={opponent} size={36} onDark />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Last · Week {game.week}</span>
          <span className="font-display text-xl font-bold text-white">
            <span className={won ? "text-rank-good" : "text-red-light"}>{won ? "W" : us === them ? "T" : "L"}</span>{" "}
            {us}-{them} {opponentLabel(opponent, isHome)}
          </span>
        </div>
        <p className="truncate text-sm text-white/80">{formatDate(game.date)}</p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-white/70">Recap</span>
      <span aria-hidden className="hidden text-white/50 sm:inline">→</span>
    </Link>
  );
}
