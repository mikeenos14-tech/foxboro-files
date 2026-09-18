import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { PlayoffScenarioTracker } from "@/components/schedule/PlayoffScenarioTracker";
import { HeroAnswerCard } from "@/components/shared/HeroAnswerCard";
import { ordinal } from "@/lib/calc/ranks";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const [rows, projection] = await Promise.all([
    store.getSchedule(),
    store.getSeasonProjection(),
  ]);

  const currentWeek =
    rows.filter((r) => r.result).sort((a, b) => b.week - a.week)[0]?.week ?? 1;

  const remaining = rows.filter((r) => !r.result);
  const remainingDivisional = remaining.filter((r) => r.isDivisional).length;
  const avgOpponentEpaRank =
    remaining.length > 0
      ? Math.round(remaining.reduce((sum, r) => sum + r.opponentEpaRank, 0) / remaining.length)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">Schedule</h1>
        <p className="text-sm text-muted">
          Full season, with opponent strength context beyond just record.
        </p>
      </div>

      {remaining.length > 0 && avgOpponentEpaRank !== null && (
        <HeroAnswerCard
          headline={
            <>
              {remaining.length} games remain, {remainingDivisional} of them{" "}
              <span className="underline decoration-white/40">divisional</span> — the average
              remaining opponent ranks {ordinal(avgOpponentEpaRank)} in the NFL by EPA/play.
            </>
          }
        />
      )}

      <ScheduleTable rows={rows} />

      <PlayoffScenarioTracker currentWeek={currentWeek} projection={projection} />
    </div>
  );
}
