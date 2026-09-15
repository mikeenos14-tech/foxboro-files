import type { ScheduleRow } from "@/lib/data/types";
import { formatDate, formatPercent } from "@/lib/util/format";
import { ordinal } from "@/lib/calc/ranks";

const resultClasses: Record<string, string> = {
  W: "text-rank-good font-bold",
  L: "text-rank-bad font-bold",
  T: "text-rank-mid font-bold",
};

export function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-2">Wk</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Opp</th>
            <th className="px-3 py-2">Site</th>
            <th className="px-3 py-2">Opp Record</th>
            <th className="px-3 py-2">Opp EPA Rank</th>
            <th className="px-3 py-2">Opp SOS</th>
            <th className="px-3 py-2">Result / Win Prob</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.gameId}
              className={`border-b border-border last:border-0 ${
                r.isDivisional ? "bg-navy/5" : ""
              }`}
            >
              <td className="px-3 py-2">{r.week}</td>
              <td className="px-3 py-2 text-muted">{formatDate(r.date)}</td>
              <td className="px-3 py-2 font-medium">
                {r.opponent}
                {r.isDivisional && (
                  <span className="ml-1 text-xs text-red">DIV</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted">
                {r.homeAway === "home" ? "Home" : "Away"}
              </td>
              <td className="px-3 py-2 text-muted">
                {r.opponentRecord} ({r.opponentPointDiff > 0 ? "+" : ""}
                {r.opponentPointDiff})
              </td>
              <td className="px-3 py-2 text-muted">
                {ordinal(r.opponentEpaRank)}
              </td>
              <td className="px-3 py-2 text-muted">
                {formatPercent(r.strengthOfSchedule.opponentSos, 0)}
              </td>
              <td className="px-3 py-2">
                {r.result ? (
                  <span className={resultClasses[r.result]}>{r.result}</span>
                ) : r.winProbabilityEstimate !== undefined ? (
                  <span className="text-muted">
                    {formatPercent(r.winProbabilityEstimate, 0)} win prob.
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
