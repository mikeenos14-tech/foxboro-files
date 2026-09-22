import type { PositionGroupReportCard } from "@/lib/data/types";
import { gradeTier } from "@/lib/calc/ranks";

const tierClass: Record<ReturnType<typeof gradeTier>, string> = {
  good: "border-rank-good/40 bg-rank-good/10 text-rank-good",
  mid: "border-rank-mid/40 bg-rank-mid/10 text-rank-mid",
  bad: "border-rank-bad/40 bg-rank-bad/10 text-rank-bad",
};

// A one-glance "how good are we, everywhere" strip — every real position
// group's grade, before you'd otherwise have to click into the Position
// Grades tab to see any of it. LB is left out on purpose: it's the one
// illustrative placeholder in reportCards (see build-roster-data.ts),
// not real computed data, and this strip is specifically the "here's
// what we can actually back up" summary.
export function PositionGroupSummaryStrip({ cards }: { cards: PositionGroupReportCard[] }) {
  const real = cards.filter((c) => c.group !== "LB");
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {real.map((card) => {
        const tier = gradeTier(card.grade);
        return (
          <div
            key={card.group}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${tierClass[tier]}`}
          >
            <span className="font-medium text-foreground">{card.group}</span>
            <span className="font-display font-bold">{card.grade}</span>
          </div>
        );
      })}
    </div>
  );
}
