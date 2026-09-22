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
        <div key={m.group} className="lift rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{m.group}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${edgeClasses[m.edge]}`}
            >
              {edgeLabel[m.edge]}
            </span>
          </div>
          {/* The card used to end with a sentence reading "71st
              percentile vs. 42nd percentile (advantage us)" — which is
              the two numbers above it and the badge beside it, said a
              third time. The numbers just needed a unit. */}
          <div className="mt-2 flex items-baseline gap-4">
            <div>
              <span className="font-display text-xl font-semibold tabular-nums text-foreground">
                {m.ourGrade}
              </span>
              <span className="ml-1 text-xs text-muted">us</span>
            </div>
            <div>
              <span className="font-display text-xl font-semibold tabular-nums text-foreground">
                {m.theirGrade}
              </span>
              <span className="ml-1 text-xs text-muted">them</span>
            </div>
            <span className="text-[11px] text-muted">percentile vs. league</span>
          </div>
          {(m.ourStatLine || m.theirStatLine) && (
            <div className="mt-2 space-y-0.5 text-xs tabular-nums text-muted">
              {m.ourStatLine && <div>Us: {m.ourStatLine}</div>}
              {m.theirStatLine && <div>Them: {m.theirStatLine}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
