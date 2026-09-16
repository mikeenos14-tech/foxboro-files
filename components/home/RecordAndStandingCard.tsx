import type { DivisionStanding, ScheduleRow } from "@/lib/data/types";
import { CountUp } from "@/components/shared/CountUp";
import { ordinal } from "@/lib/calc/ranks";

export function RecordAndStandingCard({
  schedule,
  standings,
}: {
  schedule: ScheduleRow[];
  standings: DivisionStanding[];
}) {
  const played = schedule.filter((g) => g.result);
  const wins = played.filter((g) => g.result === "W").length;
  const losses = played.filter((g) => g.result === "L").length;
  const ties = played.filter((g) => g.result === "T").length;
  const rank = standings.findIndex((s) => s.isUs) + 1;

  return (
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
      <span className="text-sm font-medium text-white/70">Record</span>
      <div className="mt-1 font-display text-4xl font-bold text-white">
        <CountUp value={wins} duration={700} />-
        <CountUp value={losses} duration={700} />
        {ties > 0 && (
          <>
            -<CountUp value={ties} duration={700} />
          </>
        )}
      </div>
      <p className="mt-1 text-sm text-white/70">
        {rank > 0 ? `${ordinal(rank)} in AFC East` : "AFC East"}
      </p>
    </div>
  );
}
