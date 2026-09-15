import type { InjuryReportEntry } from "@/lib/data/types";

const statusClasses: Record<string, string> = {
  Out: "text-red font-semibold",
  Doubtful: "text-red font-semibold",
  Questionable: "text-rank-mid font-semibold",
  Probable: "text-rank-good font-semibold",
};

function Practice({ status }: { status?: string }) {
  if (!status) return <span className="text-muted">—</span>;
  const cls =
    status === "DNP"
      ? "text-red"
      : status === "Limited"
        ? "text-rank-mid"
        : "text-rank-good";
  return <span className={cls}>{status}</span>;
}

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
            <th className="px-3 py-2">Wed</th>
            <th className="px-3 py-2">Thu</th>
            <th className="px-3 py-2">Fri</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.playerId} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium">
                {e.playerName} <span className="text-muted">{e.position}</span>
              </td>
              <td className="px-3 py-2 text-muted">{e.injury}</td>
              <td className="px-3 py-2">
                <Practice status={e.wednesday} />
              </td>
              <td className="px-3 py-2">
                <Practice status={e.thursday} />
              </td>
              <td className="px-3 py-2">
                <Practice status={e.friday} />
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
