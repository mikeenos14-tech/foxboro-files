import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { PlayoffScenarioTracker } from "@/components/schedule/PlayoffScenarioTracker";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const [rows, projection] = await Promise.all([
    store.getSchedule(),
    store.getSeasonProjection(),
  ]);

  const currentWeek =
    rows.filter((r) => r.result).sort((a, b) => b.week - a.week)[0]?.week ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-navy dark:text-white">Schedule</h1>
        <p className="text-sm text-muted">
          Full season, with opponent strength context beyond just record.
        </p>
      </div>

      <ScheduleTable rows={rows} />

      <PlayoffScenarioTracker currentWeek={currentWeek} projection={projection} />
    </div>
  );
}
