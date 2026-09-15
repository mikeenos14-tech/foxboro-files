import type { TeamStatSnapshot } from "@/lib/data/types";
import { formatPercent } from "@/lib/util/format";

export function SituationalSplitsTable({
  stats,
}: {
  stats: TeamStatSnapshot;
}) {
  const rows = [
    {
      label: "Red Zone TD%",
      offense: formatPercent(stats.redZonePct.offense.value),
      defense: formatPercent(stats.redZonePct.defense.value),
    },
    {
      label: "3rd Down Conv%",
      offense: formatPercent(stats.thirdDownPct.offense.value),
      defense: formatPercent(stats.thirdDownPct.defense.value),
    },
    {
      label: "2-Min Drill EPA",
      offense: stats.twoMinuteDrillEpa.offense.value.toFixed(2),
      defense: stats.twoMinuteDrillEpa.defense.value.toFixed(2),
    },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-2">Situation</th>
            <th className="px-3 py-2">Offense</th>
            <th className="px-3 py-2">Defense</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium">{r.label}</td>
              <td className="px-3 py-2">{r.offense}</td>
              <td className="px-3 py-2">{r.defense}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-3 gap-2 border-t border-border p-3 text-center text-xs text-muted">
        <div>
          Home: {stats.splits.home.wins}-{stats.splits.home.losses}
        </div>
        <div>
          Away: {stats.splits.away.wins}-{stats.splits.away.losses}
        </div>
        <div>
          Division: {stats.splits.divisional.wins}-{stats.splits.divisional.losses}
        </div>
      </div>
    </div>
  );
}
