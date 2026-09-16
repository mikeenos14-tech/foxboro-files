import type { GameRecap } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";
import { signed } from "@/lib/util/format";

export function PlayerOfTheGameCard({
  playerOfTheGame,
}: {
  playerOfTheGame: GameRecap["playerOfTheGame"];
}) {
  return (
    <div className="rounded-lg border border-red/30 bg-red/5 p-4">
      <span className="text-xs font-bold uppercase tracking-wide text-red">
        Player of the Game (Win Probability Added)
      </span>
      <div className="mt-2 flex items-center gap-3">
        <PlayerHeadshot
          name={playerOfTheGame.playerName}
          imageUrl={playerOfTheGame.headshotUrl}
          size={56}
        />
        <div>
          <div className="text-lg font-bold text-foreground">
            {playerOfTheGame.playerName}
          </div>
          <div className="text-sm text-muted">
            {signed(playerOfTheGame.wpa * 100, 0)}% WPA
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">{playerOfTheGame.reason}</p>
    </div>
  );
}
