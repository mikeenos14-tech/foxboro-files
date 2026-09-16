import type { QBDeepDive as QBData } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";
import { RankBadge } from "@/components/shared/RankBadge";
import { formatPercent, signed } from "@/lib/util/format";

export function QBDeepDive({ qb }: { qb: QBData }) {
  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <PlayerHeadshot name={qb.playerName} imageUrl={qb.headshotUrl} size={56} />
        <div>
          <h3 className="text-lg font-bold text-foreground">{qb.playerName}</h3>
          <p className="text-sm text-muted">
            {qb.completions}/{qb.attempts}, {qb.yards} yds, {qb.tds} TD,{" "}
            {qb.ints} INT
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        <StatTile label="CPOE" value={signed(qb.cpoe, 1)} rank={qb.ranks?.cpoe.leagueRank} />
        <StatTile
          label="Turnover-worthy rate"
          value={formatPercent(qb.turnoverWorthyPlayRate, 1)}
          rank={qb.ranks?.turnoverWorthyPlayRate.leagueRank}
        />
        <StatTile
          label="Clean pocket EPA"
          value={signed(qb.cleanPocketEpa)}
          rank={qb.ranks?.cleanPocketEpa.leagueRank}
        />
        <StatTile
          label="Under pressure EPA"
          value={signed(qb.pressureEpa)}
          rank={qb.ranks?.pressureEpa.leagueRank}
        />
      </div>

      <div className="mt-4">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Completion % by depth of target
        </span>
        <div className="mt-2 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-foreground">
              {formatPercent(qb.accuracyByDepth.short)}
            </div>
            <div className="text-xs text-muted">Short (0-9 yds)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {formatPercent(qb.accuracyByDepth.medium)}
            </div>
            <div className="text-xs text-muted">Medium (10-19 yds)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {formatPercent(qb.accuracyByDepth.deep)}
            </div>
            <div className="text-xs text-muted">Deep (20+ yds)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// items-start (not items-center) so the badge stays pinned to the top of
// the row regardless of whether the label wraps to a second line — with
// items-center, a wrapped label grows the row taller and re-centers the
// badge lower than a sibling tile whose shorter label stayed on one line.
// gap-1.5 with no justify-between keeps the badge hugging the label
// instead of stretching to the tile's far edge.
function StatTile({ label, value, rank }: { label: string; value: string; rank?: number }) {
  return (
    <div>
      <div className="flex items-start gap-1.5">
        <span className="text-xs text-muted">{label}</span>
        {rank !== undefined && (
          <span className="mt-px shrink-0">
            <RankBadge leagueRank={rank} />
          </span>
        )}
      </div>
      <div className="mt-0.5 text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}
