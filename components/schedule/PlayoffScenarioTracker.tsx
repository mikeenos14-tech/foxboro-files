import type { SeasonProjection } from "@/lib/data/types";

// Phase 3 feature. Renders only once scenarios are mathematically meaningful;
// the actual "what needs to happen" logic ships in Phase 3 alongside the rest
// of the narrative layer. This placeholder keeps the schedule page's layout
// stable so it doesn't jump around once the tracker goes live.
export function PlayoffScenarioTracker({
  currentWeek,
  projection,
}: {
  currentWeek: number;
  projection: SeasonProjection;
}) {
  if (currentWeek < 10) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold">Playoff Scenarios</h3>
      <p className="mt-1 text-sm text-muted">
        Projected {projection.projectedWins}-{projection.projectedLosses}, ~
        {Math.round((projection.playoffOdds ?? 0) * 100)}% playoff odds.
        Detailed weekly scenarios coming in a future update.
      </p>
    </div>
  );
}
