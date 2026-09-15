import type { ScheduleRow } from "@/lib/data/types";

export function RecordAndStandingCard({
  schedule,
}: {
  schedule: ScheduleRow[];
}) {
  const played = schedule.filter((g) => g.result);
  const wins = played.filter((g) => g.result === "W").length;
  const losses = played.filter((g) => g.result === "L").length;
  const ties = played.filter((g) => g.result === "T").length;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="text-sm font-medium text-muted">Record</span>
      <div className="mt-1 text-3xl font-bold text-navy">
        {wins}-{losses}
        {ties > 0 ? `-${ties}` : ""}
      </div>
      <p className="mt-1 text-sm text-muted">AFC East</p>
    </div>
  );
}
