import type { PositionGroupReportCard as ReportCardData } from "@/lib/data/types";
import { SoWhatNote } from "@/components/shared/SoWhatNote";
import { gradeTier } from "@/lib/calc/ranks";

const trendSymbol: Record<ReportCardData["trend"], string> = {
  up: "▲",
  down: "▼",
  flat: "▬",
};

const trendClass: Record<ReportCardData["trend"], string> = {
  up: "text-rank-good",
  down: "text-rank-bad",
  flat: "text-muted",
};

export function PositionGroupReportCard({ card }: { card: ReportCardData }) {
  const diff = card.grade - card.leagueAvg;
  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{card.group}</span>
        <span className={`text-sm ${trendClass[card.trend]}`}>
          {trendSymbol[card.trend]}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold text-navy dark:text-white">
          {card.grade}
        </span>
        <span className="text-xs text-muted">
          vs. {card.leagueAvg} league avg ({diff > 0 ? "+" : ""}
          {diff})
        </span>
      </div>
      <SoWhatNote sentiment={gradeTier(card.grade)}>{card.soWhat}</SoWhatNote>
    </div>
  );
}
