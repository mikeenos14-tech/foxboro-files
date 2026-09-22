import type { PositionMatchup } from "@/lib/data/types";
import { SoWhatNote, type Sentiment } from "./SoWhatNote";

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

const edgeSentiment: Record<PositionMatchup["edge"], Sentiment> = {
  us: "good",
  them: "bad",
  even: "mid",
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
          <div className="mt-2 flex items-center gap-3 text-sm text-muted">
            <span>Us: {m.ourGrade}</span>
            <span>Them: {m.theirGrade}</span>
          </div>
          {(m.ourStatLine || m.theirStatLine) && (
            <div className="mt-1.5 space-y-0.5 text-xs tabular-nums text-muted">
              {m.ourStatLine && <div>Us: {m.ourStatLine}</div>}
              {m.theirStatLine && <div>Them: {m.theirStatLine}</div>}
            </div>
          )}
          <SoWhatNote sentiment={edgeSentiment[m.edge]}>{m.note}</SoWhatNote>
        </div>
      ))}
    </div>
  );
}
