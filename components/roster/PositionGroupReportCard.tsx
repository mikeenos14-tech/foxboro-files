import type { PositionGroupReportCard as ReportCardData } from "@/lib/data/types";
import { SoWhatNote } from "@/components/shared/SoWhatNote";
import { CountUp } from "@/components/shared/CountUp";
import { PercentBar } from "@/components/shared/PercentBar";
import { gradeTier, ordinal } from "@/lib/calc/ranks";

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

// Grade is already a 0-100 percentile (50 = league average by
// construction — see build-roster-data.ts), so the tier color is the
// entire "vs. league" story; no separate average-comparison line needed.
// Carried on both the card's left edge and the percentile pill so it reads
// at a glance across a full grid, not just on close inspection.
const tierAccent: Record<ReturnType<typeof gradeTier>, string> = {
  good: "border-l-rank-good",
  mid: "border-l-rank-mid",
  bad: "border-l-rank-bad",
};

const tierBadge: Record<ReturnType<typeof gradeTier>, string> = {
  good: "bg-rank-good/15 text-rank-good ring-rank-good/40",
  mid: "bg-rank-mid/15 text-rank-mid ring-rank-mid/40",
  bad: "bg-rank-bad/15 text-rank-bad ring-rank-bad/40",
};

export function PositionGroupReportCard({ card }: { card: ReportCardData }) {
  const tier = gradeTier(card.grade);
  return (
    <div
      className={`lift rounded-lg border border-border border-l-4 bg-surface p-4 ${tierAccent[tier]}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{card.group}</span>
        <span className={`text-sm ${trendClass[card.trend]}`}>
          {trendSymbol[card.trend]}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold text-foreground">
          <CountUp value={card.grade} />
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tierBadge[tier]}`}
        >
          {ordinal(card.grade)} percentile
        </span>
      </div>
      <PercentBar value={card.grade} sentiment={tier} className="mt-2" />
      {card.statLine && (
        <div className="mt-2 text-xs tabular-nums text-muted">{card.statLine}</div>
      )}
      <SoWhatNote sentiment={tier}>{card.soWhat}</SoWhatNote>
    </div>
  );
}
