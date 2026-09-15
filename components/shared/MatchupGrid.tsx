import type { PositionMatchup } from "@/lib/data/types";

const edgeClasses: Record<PositionMatchup["edge"], string> = {
  us: "bg-rank-good/10 text-rank-good ring-rank-good/30",
  them: "bg-rank-bad/10 text-rank-bad ring-rank-bad/30",
  even: "bg-rank-mid/10 text-rank-mid ring-rank-mid/30",
};

const edgeLabel: Record<PositionMatchup["edge"], string> = {
  us: "Edge: Us",
  them: "Edge: Them",
  even: "Even",
};

export function MatchupGrid({ matchups }: { matchups: PositionMatchup[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {matchups.map((m) => (
        <div key={m.group} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{m.group}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${edgeClasses[m.edge]}`}
            >
              {edgeLabel[m.edge]}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-muted">
            <span>Us: {m.ourGrade}</span>
            <span>Them: {m.theirGrade}</span>
          </div>
          <p className="mt-2 text-sm text-muted italic border-l-2 border-red pl-2">
            {m.note}
          </p>
        </div>
      ))}
    </div>
  );
}
