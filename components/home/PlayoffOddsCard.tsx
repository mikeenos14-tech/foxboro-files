import type { SeasonProjection } from "@/lib/data/types";
import { formatPercent } from "@/lib/util/format";

export function PlayoffOddsCard({
  projection,
}: {
  projection: SeasonProjection;
}) {
  return (
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
      <span className="text-sm font-medium text-white/70">Playoff Odds</span>
      <div className="mt-1 font-display text-4xl font-bold text-white">
        {projection.playoffOdds !== undefined
          ? formatPercent(projection.playoffOdds)
          : "—"}
      </div>
      <p className="mt-1 text-sm text-white/70">
        Projected {projection.projectedWins}-{projection.projectedLosses}
      </p>
    </div>
  );
}
