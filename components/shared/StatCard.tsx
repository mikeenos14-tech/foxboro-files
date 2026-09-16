import { rankTier } from "@/lib/calc/ranks";
import { RankBadge } from "./RankBadge";
import { SoWhatNote } from "./SoWhatNote";
import { CountUp } from "./CountUp";

export function StatCard({
  label,
  value,
  leagueRank,
  soWhat,
  animate,
}: {
  label: string;
  value: string;
  leagueRank?: number;
  soWhat?: string;
  /** When provided, animates the number instead of showing static `value`. */
  animate?: { value: number; decimals?: number; prefix?: string; suffix?: string };
}) {
  const sentiment = leagueRank !== undefined ? rankTier(leagueRank) : "neutral";

  return (
    <div className="lift count-in rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted">{label}</span>
        {leagueRank !== undefined && <RankBadge leagueRank={leagueRank} />}
      </div>
      <div className="mt-1 font-display text-3xl font-semibold text-foreground">
        {animate ? (
          <CountUp
            value={animate.value}
            decimals={animate.decimals}
            prefix={animate.prefix}
            suffix={animate.suffix}
          />
        ) : (
          value
        )}
      </div>
      {soWhat && <SoWhatNote sentiment={sentiment}>{soWhat}</SoWhatNote>}
    </div>
  );
}
