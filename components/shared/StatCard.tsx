import { RankBadge } from "./RankBadge";
import { SoWhatNote } from "./SoWhatNote";

export function StatCard({
  label,
  value,
  leagueRank,
  soWhat,
}: {
  label: string;
  value: string;
  leagueRank?: number;
  soWhat?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {leagueRank !== undefined && <RankBadge leagueRank={leagueRank} />}
      </div>
      <div className="mt-1 text-2xl font-bold text-navy">{value}</div>
      {soWhat && <SoWhatNote>{soWhat}</SoWhatNote>}
    </div>
  );
}
