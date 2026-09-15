import { rankTier } from "@/lib/calc/ranks";
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
  const sentiment = leagueRank !== undefined ? rankTier(leagueRank) : "neutral";

  return (
    <div className="lift count-in rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {leagueRank !== undefined && <RankBadge leagueRank={leagueRank} />}
      </div>
      <div className="mt-1 font-display text-3xl font-semibold text-navy dark:text-white">
        {value}
      </div>
      {soWhat && <SoWhatNote sentiment={sentiment}>{soWhat}</SoWhatNote>}
    </div>
  );
}
