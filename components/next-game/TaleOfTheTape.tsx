import type { OpponentMatchupData, RankedStat } from "@/lib/data/types";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent } from "@/lib/util/format";
import { PriorBlendNote } from "./PriorBlendNote";

// Each offense against the defense it faces, EPA rank and success rate
// side by side. Replaces two opponent-only rank cards and a separate
// success-rate box that between them described the same matchup.
function Unit({ label, epaRank, success, align }: { label: string; epaRank: number; success: RankedStat; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-display text-xl font-semibold">
        {ordinal(epaRank)}
        <span className="ml-1 text-xs font-normal text-muted">EPA</span>
      </div>
      <div className="text-sm">
        {formatPercent(success.value)}
        <span className="ml-1 text-xs text-muted">success ({ordinal(success.leagueRank)})</span>
      </div>
    </div>
  );
}

export function TaleOfTheTape({ matchup }: { matchup: OpponentMatchupData }) {
  const opp = matchup.opponent;
  const { ourEpaRank, opponentEpaRank, successRate } = matchup;
  const rows = [
    {
      key: "our-offense",
      left: { label: "NE offense", epaRank: ourEpaRank.offense, success: successRate.us.offense },
      right: { label: `${opp} defense`, epaRank: opponentEpaRank.defense, success: successRate.them.defense },
    },
    {
      key: "their-offense",
      left: { label: `${opp} offense`, epaRank: opponentEpaRank.offense, success: successRate.them.offense },
      right: { label: "NE defense", epaRank: ourEpaRank.defense, success: successRate.us.defense },
    },
  ];
  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold">Tale of the Tape</h3>
      <p className="mt-1 text-xs text-muted">
        League rank of 32 by EPA per play, and success rate — how often a play improves the
        offense&apos;s chances of scoring (for a defense, how often it allows that).
      </p>
      <div className="mt-3 divide-y divide-border">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3">
            <Unit {...r.left} align="left" />
            <span className="text-xs text-muted">vs.</span>
            <Unit {...r.right} align="right" />
          </div>
        ))}
      </div>
      <PriorBlendNote
        weight={matchup.priorBlendWeight}
        subject="The EPA ranks"
        className="mt-2"
      />
      {matchup.priorBlendWeight > 0 && (
        <p className="mt-1 text-xs text-muted">Success rate is this season only.</p>
      )}
    </div>
  );
}
