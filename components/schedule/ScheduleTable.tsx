import { Fragment } from "react";
import type { ScheduleRow } from "@/lib/data/types";
import { formatDate, formatPercent } from "@/lib/util/format";
import { ordinal } from "@/lib/calc/ranks";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { Legend } from "@/components/shared/Legend";

const resultClasses: Record<string, string> = {
  W: "text-rank-good font-bold",
  L: "text-rank-bad font-bold",
  T: "text-rank-mid font-bold",
};

// Fits a 375px phone without sideways scrolling. It used to be a fixed
// 720px table, so on a phone the result/win-chance column — the one
// people open a schedule for — sat off-screen. Date, record and rank
// fold away below tablet width; the date moves under the opponent.
// The "Opp's SOS (net pts)" column is gone: a number like −18.3 needed a
// paragraph to explain and still didn't tell a fan anything.
export function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-2">Wk</th>
            <th className="hidden px-3 py-2 sm:table-cell">Date</th>
            <th className="px-3 py-2">Opponent</th>
            <th className="hidden px-3 py-2 sm:table-cell">Their record</th>
            <th className="hidden px-3 py-2 sm:table-cell">Their rank</th>
            <th className="px-3 py-2 text-right sm:text-left">Result / win chance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            // The bye is simply absent from the schedule data, so the
            // table used to jump from Week 10 straight to Week 12 with no
            // explanation — which reads as a rendering bug. Every real
            // schedule page labels it.
            const prev = i > 0 ? rows[i - 1] : null;
            const byeWeek = prev && r.week > prev.week + 1 ? prev.week + 1 : null;

            return (
              <Fragment key={r.gameId}>
                {byeWeek !== null && (
                  <tr className="border-b border-border bg-navy/5">
                    <td className="px-3 py-2 text-muted">{byeWeek}</td>
                    <td className="px-3 py-2 text-xs uppercase tracking-wide text-muted" colSpan={5}>
                      Bye week
                    </td>
                  </tr>
                )}
                <tr
                  className={`border-b border-border transition-colors last:border-0 hover:bg-navy/10 ${
                    r.isDivisional ? "bg-navy/5" : ""
                  }`}
                >
                  <td className="px-3 py-2 align-top">{r.week}</td>
                  <td className="hidden px-3 py-2 text-muted sm:table-cell">{formatDate(r.date)}</td>
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-xs font-normal text-muted">
                        {r.homeAway === "home" ? "vs" : "@"}
                      </span>
                      <TeamLogo team={r.opponent} size={22} />
                      {r.opponent}
                      {r.isDivisional && <span className="text-xs text-red">DIV</span>}
                    </div>
                    <div className="ml-7 text-xs font-normal text-muted sm:hidden">
                      <span className="whitespace-nowrap">{formatDate(r.date)}</span> ·{" "}
                      <span className="whitespace-nowrap">{r.opponentRecord}</span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 text-muted sm:table-cell">{r.opponentRecord}</td>
                  <td className="hidden px-3 py-2 text-muted sm:table-cell">
                    {ordinal(r.opponentEpaRank)}
                  </td>
                  <td className="px-3 py-2 text-right sm:text-left">
                    {r.result ? (
                      <span className={resultClasses[r.result]}>
                        {r.result}
                        {r.ourScore !== undefined && r.theirScore !== undefined && (
                          <span className="ml-1 font-normal text-muted">
                            {r.ourScore}-{r.theirScore}
                          </span>
                        )}
                      </span>
                    ) : r.winProbabilityEstimate !== undefined ? (
                      <span className="text-muted">{formatPercent(r.winProbabilityEstimate, 0)}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <Legend
        className="border-t border-border bg-background/50"
        items={[
          { term: "DIV", definition: "divisional matchup" },
          { term: "Their rank", definition: "overall rank by EPA/play, offense minus defense — 1st is best" },
          { term: "Win chance", definition: "a rough model estimate, not a betting line" },
        ]}
      />
    </div>
  );
}
