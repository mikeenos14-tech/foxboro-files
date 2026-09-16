import type { LeagueEpaRanking } from "@/lib/data/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { ordinal } from "@/lib/calc/ranks";

function Table({
  title,
  rows,
  epaKey,
  rankKey,
}: {
  title: string;
  rows: LeagueEpaRanking[];
  epaKey: "offenseEpa" | "defenseEpa";
  rankKey: "offenseRank" | "defenseRank";
}) {
  const sorted = [...rows].sort((a, b) => a[rankKey] - b[rankKey]);
  return (
    <div className="lift overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-2 py-2 font-medium">Team</th>
            <th className="px-4 py-2 text-right font-medium">EPA/play</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.team} className={`border-b border-border last:border-0 ${r.team === "NE" ? "bg-red/10" : ""}`}>
              <td className="px-4 py-2 text-muted">{ordinal(r[rankKey])}</td>
              <td className={`px-2 py-2 ${r.team === "NE" ? "border-l-4 border-l-red" : ""}`}>
                <div className="flex items-center gap-2">
                  <TeamLogo team={r.team} size={18} />
                  <span className={r.team === "NE" ? "font-bold text-red" : "font-medium"}>
                    {r.team}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2 text-right text-muted">{r[epaKey].toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeagueEpaRankings({ rankings }: { rankings: LeagueEpaRanking[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Table title="NFL Offenses (EPA/play)" rows={rankings} epaKey="offenseEpa" rankKey="offenseRank" />
      <Table title="NFL Defenses (EPA/play allowed)" rows={rankings} epaKey="defenseEpa" rankKey="defenseRank" />
    </div>
  );
}
