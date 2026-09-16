import type { DivisionStanding } from "@/lib/data/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { signed } from "@/lib/util/format";

export function DivisionStandings({ standings }: { standings: DivisionStanding[] }) {
  return (
    <div className="lift overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold">AFC East</h3>
      </div>
      <table className="w-full text-left text-sm">
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.team}
              className={`border-b border-border last:border-0 ${s.isUs ? "bg-navy/10" : ""}`}
            >
              <td className="px-4 py-2.5 text-muted">{i + 1}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <TeamLogo team={s.team} size={22} />
                  <span className={s.isUs ? "font-bold text-foreground" : "font-medium"}>
                    {s.team}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2.5 font-medium">
                {s.wins}-{s.losses}
                {s.ties > 0 ? `-${s.ties}` : ""}
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
