import type { LeagueEpaRanking } from "@/lib/data/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent } from "@/lib/util/format";

function Table({
  title,
  rows,
  epaKey,
  rankKey,
  successKey,
  successRankKey,
}: {
  title: string;
  rows: LeagueEpaRanking[];
  epaKey: "offenseEpa" | "defenseEpa";
  rankKey: "offenseRank" | "defenseRank";
  successKey: "offenseSuccess" | "defenseSuccess";
  successRankKey: "offenseSuccessRank" | "defenseSuccessRank";
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
            <th className="px-2 py-2 text-right font-medium">EPA/play</th>
            <th className="px-4 py-2 text-right font-medium">Success</th>
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
              <td className="px-2 py-2 text-right text-muted">{r[epaKey].toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-muted">
                {formatPercent(r[successKey])}
                <span className="ml-1 text-xs">({ordinal(r[successRankKey])})</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeagueEpaRankings({ rankings }: { rankings: LeagueEpaRanking[] }) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Ranked by EPA/play (how much a team gains per play), adjusted for opponents. Success is
        how often a play improved the chances of scoring, with its own rank.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Table
          title="NFL Offenses"
          rows={rankings}
          epaKey="offenseEpa"
          rankKey="offenseRank"
          successKey="offenseSuccess"
          successRankKey="offenseSuccessRank"
        />
        <Table
          title="NFL Defenses (allowed)"
          rows={rankings}
          epaKey="defenseEpa"
          rankKey="defenseRank"
          successKey="defenseSuccess"
          successRankKey="defenseSuccessRank"
        />
      </div>
    </div>
  );
}
