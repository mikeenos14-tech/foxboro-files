import type { GameRecap } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";

export function PlayerOfTheGameCard({
  playerOfTheGame,
}: {
  playerOfTheGame: GameRecap["playerOfTheGame"];
}) {
  return (
    <div className="rounded-lg border border-red/30 bg-red/5 p-4">
      <span className="text-xs font-bold uppercase tracking-wide text-red">
        Player of the Game
      </span>
      <div className="mt-2 flex items-center gap-3">
        <PlayerHeadshot
          name={playerOfTheGame.playerName}
          imageUrl={playerOfTheGame.headshotUrl}
          size={56}
        />
        <span className="text-lg font-bold text-navy dark:text-white">
          {playerOfTheGame.playerName}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">{playerOfTheGame.reason}</p>
    </div>
  );
}
