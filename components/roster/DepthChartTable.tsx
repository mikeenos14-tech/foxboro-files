import type { DepthChartEntry } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";

export function DepthChartTable({ chart }: { chart: DepthChartEntry[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {chart.map((entry) => (
        <div key={entry.position} className="lift rounded-lg border border-border bg-surface p-4">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">
            {entry.position}
          </span>
          <ul className="mt-2 space-y-2">
            {entry.players.map((p) => (
              <li key={p.playerId} className="flex items-center gap-2">
                <PlayerHeadshot name={p.playerName} espnId={p.espnId} size={32} />
                <span className="text-sm font-medium">
                  {p.rank}. {p.playerName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
