import type { SeasonProjection } from "@/lib/data/types";
import { formatPercent } from "@/lib/util/format";

export function PlayoffOddsCard({
  projection,
}: {
  projection: SeasonProjection;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="text-sm font-medium text-muted">Playoff Odds</span>
      <div className="mt-1 text-3xl font-bold text-navy">
        {projection.playoffOdds !== undefined
          ? formatPercent(projection.playoffOdds)
          : "—"}
      </div>
      <p className="mt-1 text-sm text-muted">
        Projected {projection.projectedWins}-{projection.projectedLosses}
      </p>
    </div>
  );
}
