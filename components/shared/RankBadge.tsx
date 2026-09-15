import { ordinal, rankTier } from "@/lib/calc/ranks";

const tierClasses: Record<ReturnType<typeof rankTier>, string> = {
  good: "bg-rank-good/10 text-rank-good ring-rank-good/30",
  mid: "bg-rank-mid/10 text-rank-mid ring-rank-mid/30",
  bad: "bg-rank-bad/10 text-rank-bad ring-rank-bad/30",
};

export function RankBadge({ leagueRank }: { leagueRank: number }) {
  const tier = rankTier(leagueRank);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tierClasses[tier]}`}
    >
      {ordinal(leagueRank)} in NFL
    </span>
  );
}
