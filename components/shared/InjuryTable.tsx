import type { InjuryReportEntry } from "@/lib/data/types";

const statusClasses: Record<string, string> = {
  Out: "text-red font-semibold",
  Doubtful: "text-red font-semibold",
  Questionable: "text-rank-mid font-semibold",
  Probable: "text-rank-good font-semibold",
};

const practiceClasses: Record<string, string> = {
  "Did Not Participate": "text-red",
  Limited: "text-rank-mid",
  Full: "text-rank-good",
};

export function InjuryTable({ entries }: { entries: InjuryReportEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        No injuries currently reported.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Injury</th>
            <th className="px-3 py-2">Practice Status</th>
            <th className="px-3 py-2">Game Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.playerId}
              className="border-b border-border transition-colors last:border-0 hover:bg-navy/10"
            >
              <td className="px-3 py-2 font-medium">
                {e.playerName} <span className="text-muted">{e.position}</span>
              </td>
              <td className="px-3 py-2 text-muted">{e.injury}</td>
              <td
                className={`px-3 py-2 ${e.practiceStatus ? practiceClasses[e.practiceStatus] : "text-muted"}`}
              >
                {e.practiceStatus ?? "—"}
              </td>
              <td
                className={`px-3 py-2 ${e.gameStatus ? statusClasses[e.gameStatus] : ""}`}
              >
                {e.gameStatus ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
