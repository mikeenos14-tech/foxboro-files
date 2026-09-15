import type { QBDeepDive as QBData } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";
import { formatPercent, signed } from "@/lib/util/format";

export function QBDeepDive({ qb }: { qb: QBData }) {
  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <PlayerHeadshot name={qb.playerName} imageUrl={qb.headshotUrl} size={56} />
        <div>
          <h3 className="text-lg font-bold text-navy dark:text-white">{qb.playerName}</h3>
          <p className="text-sm text-muted">
            {qb.completions}/{qb.attempts}, {qb.yards} yds, {qb.tds} TD,{" "}
            {qb.ints} INT
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <div className="text-xl font-bold text-navy dark:text-white">{signed(qb.cpoe, 1)}</div>
          <div className="text-xs text-muted">CPOE</div>
        </div>
        <div>
          <div className="text-xl font-bold text-navy dark:text-white">
            {formatPercent(qb.turnoverWorthyPlayRate, 1)}
          </div>
          <div className="text-xs text-muted">Turnover-worthy rate</div>
        </div>
        <div>
          <div className="text-xl font-bold text-navy dark:text-white">
            {signed(qb.cleanPocketEpa)}
          </div>
          <div className="text-xs text-muted">Clean pocket EPA</div>
        </div>
        <div>
          <div className="text-xl font-bold text-navy dark:text-white">
            {signed(qb.pressureEpa)}
          </div>
          <div className="text-xs text-muted">Under pressure EPA</div>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Completion % by depth of target
        </span>
        <div className="mt-2 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-navy dark:text-white">
              {formatPercent(qb.accuracyByDepth.short)}
            </div>
            <div className="text-xs text-muted">Short (0-9 yds)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-navy dark:text-white">
              {formatPercent(qb.accuracyByDepth.medium)}
            </div>
            <div className="text-xs text-muted">Medium (10-19 yds)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-navy dark:text-white">
              {formatPercent(qb.accuracyByDepth.deep)}
            </div>
            <div className="text-xs text-muted">Deep (20+ yds)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
