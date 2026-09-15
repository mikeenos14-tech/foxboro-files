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
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
      <span className="text-sm font-medium text-white/70">Record</span>
      <div className="mt-1 font-display text-4xl font-bold text-white">
        {wins}-{losses}
        {ties > 0 ? `-${ties}` : ""}
      </div>
      <p className="mt-1 text-sm text-white/70">AFC East</p>
    </div>
  );
}
