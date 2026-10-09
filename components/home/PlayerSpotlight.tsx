import Link from "next/link";
import type { GameRecap } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";

// The last game's Player of the Game, on the home page: a face on a page
// that's otherwise all numbers, and a way into the recap.
export function PlayerSpotlight({
  potg,
  gameId,
  gameLabel,
}: {
  potg: GameRecap["playerOfTheGame"];
  gameId: string;
  gameLabel: string;
}) {
  return (
    <Link
      href={`/recap/${gameId}`}
      className="lift flex items-center gap-4 rounded-lg border border-border bg-surface p-4 hover:border-navy/30"
    >
      <PlayerHeadshot name={potg.playerName} imageUrl={potg.headshotUrl} size={64} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-red">Player of the Game · {gameLabel}</p>
        <p className="mt-0.5 text-lg font-bold text-foreground">{potg.playerName}</p>
        <p className="text-sm text-muted">
          +{Math.round(potg.wpa * 100)}% win probability added. {potg.reason}
        </p>
      </div>
      <span aria-hidden className="text-muted">→</span>
    </Link>
  );
}
