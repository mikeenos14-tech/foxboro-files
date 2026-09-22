import type { RankedStat } from "@/lib/data/types";
import { rankTier, ordinal } from "@/lib/calc/ranks";

export interface MetricRow {
  label: string;
  offense: RankedStat;
  defense: RankedStat;
  /** Formats the raw value for display (percent, 2dp EPA, 1dp yards…). */
  format: (value: number) => string;
}

const tierText: Record<ReturnType<typeof rankTier>, string> = {
  good: "text-rank-good",
  mid: "text-rank-mid",
  bad: "text-rank-bad",
};

// Three metrics × two sides of the ball was being rendered as six
// identical cards. That hid the structure — the whole point is comparing
// our offense against our defense on the same measure, and card grids
// make you scan between boxes to do it. A table puts them on one line,
// costs a third of the vertical space, and reads like an analytics
// product rather than a dashboard template.
export function MetricComparisonTable({ rows }: { rows: MetricRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
            <th className="px-3 py-2.5 text-left font-medium sm:px-4">Metric</th>
            <th className="px-3 py-2.5 text-right font-medium sm:px-4">Offense</th>
            <th className="px-3 py-2.5 text-right font-medium sm:px-4">Defense</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/60 last:border-0">
              <th scope="row" className="px-3 py-3 text-left font-normal text-muted sm:px-4">
                {row.label}
              </th>
              <Cell stat={row.offense} format={row.format} />
              <Cell stat={row.defense} format={row.format} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ stat, format }: { stat: RankedStat; format: (v: number) => string }) {
  const tier = rankTier(stat.leagueRank);
  return (
    <td className="px-3 py-3 text-right sm:px-4">
      <div className="font-display text-lg font-semibold tabular-nums text-foreground">
        {format(stat.value)}
      </div>
      <div className={`text-[11px] tabular-nums ${tierText[tier]}`}>
        {ordinal(stat.leagueRank)}
      </div>
    </td>
  );
}
