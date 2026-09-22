"use client";

import { useMemo, useState } from "react";
import type { PositionGroupReportCard as ReportCardData } from "@/lib/data/types";
import { PositionGroupReportCard } from "./PositionGroupReportCard";
import { StatWindowSelector } from "@/components/shared/StatWindowSelector";

// One shared window selector for the whole grid (rather than one per
// card) so you can compare every unit over the same recent stretch at
// once. Only the grade/percentile swaps per window — trend and the
// "so what" text stay tied to the full-season sample, same as before.
export function PositionGroupCardsGrid({ cards }: { cards: ReportCardData[] }) {
  const options = useMemo(
    () => [
      { key: "season", label: "Full Season" },
      ...(cards[0]?.windows ?? []).map((w) => ({ key: w.key, label: w.label })),
    ],
    [cards]
  );
  const [selected, setSelected] = useState("season");

  const displayed = cards.map((card) => {
    if (selected === "season") return card;
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
