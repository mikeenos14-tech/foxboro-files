"use client";

import { useMemo } from "react";
import type { PositionGroupReportCard as ReportCardData, PriorSeasonSnapshot } from "@/lib/data/types";
import { PositionGroupReportCard } from "./PositionGroupReportCard";
import { StatWindowSelector } from "@/components/shared/StatWindowSelector";
import { useWindowParam } from "@/lib/hooks/useWindowParam";

// One shared window selector for the whole grid (rather than one per
// card) so you can compare every unit over the same recent stretch at
// once. Only the grade/percentile swaps per window — trend and the
// "so what" text stay tied to the full-season sample, same as before.
export function PositionGroupCardsGrid({
  cards,
  priorSeason,
  initialWindow,
}: {
  cards: ReportCardData[];
  priorSeason?: PriorSeasonSnapshot | null;
  initialWindow?: string;
}) {
  const priorKey = priorSeason ? `season-${priorSeason.season}` : null;
  const options = useMemo(
    () => [
      { key: "season", label: "Full Season" },
      ...(cards[0]?.windows ?? []).map((w) => ({ key: w.key, label: w.label })),
      ...(priorSeason ? [{ key: `season-${priorSeason.season}`, label: `${priorSeason.season} Season` }] : []),
    ],
    [cards, priorSeason]
  );
  const [selected, setSelected] = useWindowParam("gradeWindow", initialWindow, "season");

  const displayed = cards.map((card) => {
    if (selected === "season") return card;
    // A completed prior season carries its own grade, sample size and
    // confidence — swap all three so a full-season 2025 grade isn't
    // rendered with a thin-sample warning from the current season.
    if (priorKey && selected === priorKey && priorSeason) {
      const p = priorSeason.positionGroups.find((g) => g.group === card.group);
      return p
        ? {
            ...card,
            grade: p.grade,
            sampleSize: p.sampleSize,
            confidence: p.confidence,
            trend: "flat" as const,
            statLine: "",
            // The card's own text cites its sample; leaving the current
            // season's wording here would claim a 61-play sample for a
            // full prior season.
            soWhat: `Full ${priorSeason.season} season — ${p.sampleSize} plays.`,
          }
        : card;
    }
    const w = card.windows.find((w) => w.key === selected);
    return w ? { ...card, grade: w.grade } : card;
  });

  return (
    <div>
      {options.length > 1 && (
        <div className="mb-3 flex justify-end">
          <StatWindowSelector options={options} value={selected} onChange={setSelected} label="Show grades for" />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map((card) => (
          <PositionGroupReportCard key={card.group} card={card} />
        ))}
      </div>
    </div>
  );
}
