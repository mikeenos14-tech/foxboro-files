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
      {/* A second measure that strips a confound out of the headline one.
          WR/TE are graded on EPA per target, which mostly measures the
          quarterback — this is what the receivers control once the ball
          arrives, so the two diverging is the interesting part, not a
          contradiction.

          The percentile is frequently absent, and that is deliberate
          rather than a missing-data case: a league rank only appears once
          the spread between teams exceeds what chance explains, which
          takes most of a season for these. Until then the raw counts
          carry it, and the note says why there's no rank — so the reader
          isn't left wondering whether something failed to load. */}
      {card.secondaryGrade && (
        <div className="mt-3 rounded-md border border-border bg-background/40 px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted">
              {card.secondaryGrade.label}
            </span>
            {card.secondaryGrade.grade !== null && (
              <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                {card.secondaryGrade.grade}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] tabular-nums text-foreground">
            {card.secondaryGrade.detail}
          </div>
          {card.secondaryGrade.note && (
            <div className="mt-1 text-[11px] text-muted">{card.secondaryGrade.note}</div>
          )}
        </div>
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
