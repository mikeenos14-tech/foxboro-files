import Link from "next/link";
import type { Game } from "@/lib/data/types";
import { formatDate } from "@/lib/util/format";
import { TeamLogo } from "@/components/shared/TeamLogo";

// Sofascore's compact Previous/Next-game pattern: a small inline card
// living in the team header itself, not a full-height standalone stat
// card. Replaces the old CountdownCard/GameResultCard, which each burned
// a full card slot on a single 4xl number.
function CardBody({ label, game }: { label: string; game: Game }) {
  const isHome = game.homeTeam === "NE";
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const usScore = isHome ? game.homeScore : game.awayScore;
  const themScore = isHome ? game.awayScore : game.homeScore;
  const played = usScore !== undefined && themScore !== undefined;
  const won = played && usScore! > themScore!;

  return (
    <div className="w-40 shrink-0 rounded-lg bg-white/10 p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
          {label}
        </span>
        <TeamLogo team={opponent} size={18} onDark />
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        {played ? (
          <>
            <span
              className={`font-display text-xl font-bold ${won ? "text-rank-good" : "text-red-light"}`}
            >
              {won ? "W" : "L"}
            </span>
            <span className="font-display text-xl font-bold text-white">
              {usScore}-{themScore}
            </span>
          </>
        ) : (
          <span className="truncate font-display text-lg font-bold text-white">
            vs. {opponent}
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-[11px] text-white/60">
        {formatDate(game.date)}
        {played ? " · Recap →" : ""}
      </p>
    </div>
  );
}

export function MiniGameCard({
  label,
  game,
  linkToRecap,
}: {
  label: string;
  game: Game;
  linkToRecap?: boolean;
}) {
  if (linkToRecap) {
    return (
      <Link href={`/recap/${game.id}`} className="block transition hover:bg-white/5">
        <CardBody label={label} game={game} />
      </Link>
    );
  }
  return <CardBody label={label} game={game} />;
}
