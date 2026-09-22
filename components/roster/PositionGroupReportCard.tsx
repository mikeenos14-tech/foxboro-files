import type { PositionGroupReportCard as ReportCardData } from "@/lib/data/types";
import { SoWhatNote } from "@/components/shared/SoWhatNote";
import { CountUp } from "@/components/shared/CountUp";
import { PercentBar } from "@/components/shared/PercentBar";
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
      {/* The percentile used to appear three times on this card — as this
          number, as a pill beside it, and spelled out again in the
          "so what" sentence — while the real box-score stats were the
          smallest text on the card. One statement of it is enough. */}
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold text-foreground">
          <CountUp value={card.grade} />
        </span>
        <span className="text-xs text-muted">percentile</span>
      </div>
      <PercentBar value={card.grade} sentiment={tier} className="mt-2" />
      {card.statLine && (
        <div className="mt-2 text-sm tabular-nums text-foreground">{card.statLine}</div>
      )}
      {card.confidence === "low" && card.sampleSize > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-rank-mid"
          />
          Thin sample — {card.sampleSize} plays. Regressed toward league average.
        </div>
      )}
      <SoWhatNote sentiment={tier}>{card.soWhat}</SoWhatNote>
    </div>
  );
}
