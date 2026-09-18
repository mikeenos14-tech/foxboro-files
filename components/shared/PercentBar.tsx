import { gradeTier } from "@/lib/calc/ranks";

// A thin gradient-filled bar under a percentage/percentile value — makes
// magnitude readable at a glance instead of asking the reader to parse a
// bare number (the pattern Opta Analyst's "supercomputer" probability
// tables use, adapted to our own tier-color language rather than their
// pink). Reuses the same good/mid/bad tiers as RankBadge/SoWhatNote so a
// bar and its neighboring badge always agree.
const fillClass: Record<"good" | "mid" | "bad", string> = {
  good: "from-rank-good/50 to-rank-good",
  mid: "from-rank-mid/50 to-rank-mid",
  bad: "from-rank-bad/50 to-rank-bad",
};

export function PercentBar({
  value,
  sentiment,
  className,
}: {
  /** 0-100 */
  value: number;
  /** Defaults to gradeTier(value) — pass explicitly when the bar represents something other than a 0-100-is-better-higher grade (e.g. a rank-derived percentile already tiered elsewhere). */
  sentiment?: "good" | "mid" | "bad";
  className?: string;
}) {
  const tier = sentiment ?? gradeTier(value);
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-border ${className ?? ""}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r transition-[width] ${fillClass[tier]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
