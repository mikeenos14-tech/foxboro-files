import type { DivisionStanding } from "@/lib/data/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { signed } from "@/lib/util/format";

const streakClass: Record<"W" | "L" | "T", string> = {
  W: "text-rank-good",
  L: "text-rank-bad",
  T: "text-rank-mid",
};

function divisionRecordText(r: DivisionStanding["divisionRecord"]): string {
  return `${r.wins}-${r.losses}${r.ties > 0 ? `-${r.ties}` : ""}`;
}

function streakText(s: DivisionStanding["streak"]): string {
  return s ? `${s.result}${s.count}` : "—";
}

export function DivisionStandings({ standings }: { standings: DivisionStanding[] }) {
  return (
    <div className="lift overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold">Division Race &mdash; AFC East</h3>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-2 py-2 font-medium">Team</th>
            <th className="px-2 py-2 text-right font-medium">Rec</th>
            <th className="px-2 py-2 text-right font-medium">Div</th>
            <th className="px-2 py-2 text-right font-medium">Strk</th>
            <th className="px-4 py-2 text-right font-medium">+/&minus;</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.team}
              className={`border-b border-border last:border-0 ${s.isUs ? "bg-red/10" : ""}`}
            >
              <td className="px-4 py-2.5 text-muted">{i + 1}</td>
              <td className={`px-2 py-2.5 ${s.isUs ? "border-l-4 border-l-red" : ""}`}>
                <div className="flex items-center gap-2">
                  <TeamLogo team={s.team} size={20} />
                  <span className={s.isUs ? "font-bold text-red" : "font-medium"}>
                    {s.team}
                  </span>
                </div>
              </td>
              <td className="px-2 py-2.5 text-right font-medium">
                {s.wins}-{s.losses}
                {s.ties > 0 ? `-${s.ties}` : ""}
              </td>
              <td className="px-2 py-2.5 text-right text-muted">
                {divisionRecordText(s.divisionRecord)}
              </td>
              <td className={`px-2 py-2.5 text-right font-semibold ${s.streak ? streakClass[s.streak.result] : "text-muted"}`}>
                {streakText(s.streak)}
              </td>
              <td className="px-4 py-2.5 text-right text-muted">
                {signed(s.pointDifferential, 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
