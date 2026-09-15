import type { GameRecap } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";
import { signed } from "@/lib/util/format";

export function WPALeaderboard({
  starOfTheGame,
}: {
  starOfTheGame: GameRecap["starOfTheGame"];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">
        Star of the Game (Win Probability Added)
      </span>
      <div className="mt-2 flex items-center gap-3">
        <PlayerHeadshot name={starOfTheGame.playerName} size={48} />
        <div>
          <div className="font-bold text-navy">{starOfTheGame.playerName}</div>
          <div className="text-sm text-muted">
            {signed(starOfTheGame.wpa * 100, 0)}% WPA
          </div>
        </div>
      </div>
    </div>
  );
}
