import type { SeasonProjection } from "@/lib/data/types";
import { CountUp } from "@/components/shared/CountUp";

export function PlayoffOddsCard({
  projection,
}: {
  projection: SeasonProjection;
}) {
  return (
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
      <span className="text-sm font-medium text-white/70">Playoff Odds</span>
      <div className="mt-1 font-display text-4xl font-bold text-white">
        {projection.playoffOdds !== undefined ? (
          <CountUp value={projection.playoffOdds * 100} decimals={0} suffix="%" duration={900} />
        ) : (
          "—"
        )}
      </div>
      <p className="mt-1 text-sm text-white/70">
        Projected {projection.projectedWins}-{projection.projectedLosses}
      </p>
    </div>
  );
}
