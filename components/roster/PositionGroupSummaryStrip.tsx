import Link from "next/link";
import type { PositionGroupReportCard } from "@/lib/data/types";
import { gradeTier } from "@/lib/calc/ranks";

const tierClass: Record<ReturnType<typeof gradeTier>, string> = {
  good: "border-rank-good/40 bg-rank-good/10 text-rank-good",
  mid: "border-rank-mid/40 bg-rank-mid/10 text-rank-mid",
  bad: "border-rank-bad/40 bg-rank-bad/10 text-rank-bad",
};

// A one-glance "how good are we, everywhere" strip — every position
// group's grade, before you'd otherwise have to click into the Position
// Grades tab to see any of it. Each chip opens that unit's all-32-team
// ranking: "how does our pass defense compare league-wide" in one tap.
export function PositionGroupSummaryStrip({ cards }: { cards: PositionGroupReportCard[] }) {
  const real = cards;
  return (
    <div className="relative -mx-4 sm:mx-0">
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
        {real.map((card) => {
          const tier = gradeTier(card.grade);
          return (
            <Link
              key={card.group}
              href={`/around-the-league?unit=${encodeURIComponent(card.group)}#units`}
              aria-label={`${card.group}: ${card.grade} out of 100 — see all 32 teams`}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-opacity hover:opacity-80 ${tierClass[tier]}`}
            >
              <span className="font-medium text-foreground">{card.group}</span>
              <span className="font-display font-bold">{card.grade}</span>
            </Link>
          );
        })}
      </div>
      {/* Fade hint that the row scrolls sideways for more — only needed
          below the sm breakpoint, where the strip overflows instead of
          wrapping to a second line. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
    </div>
  );
}
