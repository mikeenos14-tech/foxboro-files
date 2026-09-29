import type { OpponentMatchupData, RankedStat } from "@/lib/data/types";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent } from "@/lib/util/format";

function Side({ label, stat }: { label: string; stat: RankedStat }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-display text-xl font-semibold">
        {formatPercent(stat.value)}
        <span className="ml-1 text-xs font-normal text-muted">({ordinal(stat.leagueRank)})</span>
      </div>
    </div>
  );
}

// Each offense against the defense it faces, side by side.
export function SuccessRateMatchup({
  opponent,
  successRate,
}: {
  opponent: string;
  successRate: OpponentMatchupData["successRate"];
}) {
  const rows = [
    { off: ["NE offense", successRate.us.offense], def: [`${opponent} defense allows`, successRate.them.defense] },
    { off: [`${opponent} offense`, successRate.them.offense], def: ["NE defense allows", successRate.us.defense] },
  ] as const;
  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold">Success Rate Matchup</h3>
      <p className="mt-1 text-xs text-muted">
        How often a play improves the offense&apos;s chances of scoring. This season only, ranked
        of 32.
      </p>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.off[0]} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Side label={r.off[0]} stat={r.off[1]} />
            <span className="text-xs text-muted">vs.</span>
            <div className="text-right">
              <Side label={r.def[0]} stat={r.def[1]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
