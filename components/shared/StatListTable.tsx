import type { RankedStat } from "@/lib/data/types";
import { rankTier, ordinal } from "@/lib/calc/ranks";

export interface StatListRow {
  label: string;
  stat: RankedStat;
  format: (value: number) => string;
  /** Optional trailing context, e.g. the most-penalized player. */
  note?: string;
}

const tierText: Record<ReturnType<typeof rankTier>, string> = {
  good: "text-rank-good",
  mid: "text-rank-mid",
  bad: "text-rank-bad",
};

// For groups of single-value ranked stats — special teams, discipline —
// that were being rendered as one large card each. Five cards for five
// numbers is a lot of border and padding for very little information,
// and it sat directly below a Situational Splits table that already did
// the denser thing better. Same visual language, a third of the space.
export function StatListTable({ rows }: { rows: StatListRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => {
            const tier = rankTier(row.stat.leagueRank);
            return (
              <tr key={row.label} className="border-b border-border/60 last:border-0">
                <th scope="row" className="px-3 py-3 text-left font-normal text-muted sm:px-4">
                  {row.label}
                  {row.note && <span className="ml-2 text-xs text-muted/80">{row.note}</span>}
                </th>
                <td className="px-3 py-3 text-right sm:px-4">
                  <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                    {row.format(row.stat.value)}
                  </span>
                </td>
                <td className={`w-14 px-3 py-3 text-right text-xs tabular-nums sm:w-16 sm:px-4 ${tierText[tier]}`}>
                  {ordinal(row.stat.leagueRank)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
