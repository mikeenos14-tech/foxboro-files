"use client";

import { useMemo } from "react";
import type { QBDeepDive as QBData, QBWindowStats, PriorSeasonSnapshot } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";
import { RankBadge } from "@/components/shared/RankBadge";
import { StatWindowSelector } from "@/components/shared/StatWindowSelector";
import { useWindowParam } from "@/lib/hooks/useWindowParam";
import { formatPercent, signed } from "@/lib/util/format";

export function QBDeepDive({
  qb,
  priorSeason,
  initialWindow,
}: {
  qb: QBData;
  priorSeason?: PriorSeasonSnapshot | null;
  initialWindow?: string;
}) {
  const priorKey = priorSeason ? `season-${priorSeason.season}` : null;
  const options = useMemo(
    () => [
      { key: "season", label: "Full Season" },
      ...(qb.windows ?? []).map((w) => ({ key: w.key, label: w.label })),
      ...(priorSeason ? [{ key: `season-${priorSeason.season}`, label: `${priorSeason.season} Season` }] : []),
    ],
    [qb.windows, priorSeason]
  );
  const [selected, setSelected] = useWindowParam("qbWindow", initialWindow, "season");
  const isFullSeason = selected === "season";
  // Ranks (percentile among league starters) are only computed against
  // the full-season league table — a "last N games" slice only has
  // Maye's own numbers, no league-wide comparison table for that same
  // window, so rank badges are shown for the full-season view only.
  const isPrior = priorKey !== null && selected === priorKey;
  const stats: QBWindowStats = isFullSeason
    ? qb
    : isPrior && priorSeason
      ? priorSeason.qb
      : (qb.windows?.find((w) => w.key === selected)?.stats ?? qb);

  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <PlayerHeadshot name={qb.playerName} imageUrl={qb.headshotUrl} size={56} />
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {isPrior && priorSeason ? priorSeason.qb.playerName : qb.playerName}
          </h3>
          <p className="text-sm text-muted">
            {stats.completions}/{stats.attempts}
            {stats.attempts > 0 && ` (${formatPercent(stats.completions / stats.attempts, 1)})`}, {stats.yards}{" "}
            yds, {stats.tds} TD, {stats.ints} INT
          </p>
        </div>
      </div>

      {options.length > 1 && (
        <div className="mt-3">
          <StatWindowSelector options={options} value={selected} onChange={setSelected} label="Show stats for" />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        <StatTile
          label="CPOE"
          value={signed(stats.cpoe, 1)}
          rank={isFullSeason ? qb.ranks?.cpoe.leagueRank : undefined}
        />
        <StatTile
          label="Turnover-worthy rate"
          value={formatPercent(stats.turnoverWorthyPlayRate, 1)}
          rank={isFullSeason ? qb.ranks?.turnoverWorthyPlayRate.leagueRank : undefined}
        />
        <StatTile
          label="Clean pocket EPA"
          value={signed(stats.cleanPocketEpa)}
          rank={isFullSeason ? qb.ranks?.cleanPocketEpa.leagueRank : undefined}
        />
        <StatTile
          label="Under pressure EPA"
          value={signed(stats.pressureEpa)}
          rank={isFullSeason ? qb.ranks?.pressureEpa.leagueRank : undefined}
        />
      </div>

      <div className="mt-4">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Completion % by depth of target
        </span>
        <div className="mt-2 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-foreground">
              {formatPercent(stats.accuracyByDepth.short)}
            </div>
            <div className="text-xs text-muted">Short (0-9 yds)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {formatPercent(stats.accuracyByDepth.medium)}
            </div>
            <div className="text-xs text-muted">Medium (10-19 yds)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">
              {formatPercent(stats.accuracyByDepth.deep)}
            </div>
            <div className="text-xs text-muted">Deep (20+ yds)</div>
          </div>
        </div>
      </div>

      {/* Real charted situational splits — what actually explains the
          overall number. Full-season only, so hidden when a shorter
          window is selected rather than silently showing season data. */}
      {isFullSeason && qb.situational && qb.situational.length > 0 && (
        <div className="mt-4">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">
            EPA/play by situation
          </span>
          <ul className="mt-2 space-y-1.5">
            {qb.situational.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-muted">{s.label}</span>
                <span
                  className={`w-14 shrink-0 text-right font-semibold tabular-nums ${
                    s.epa > 0 ? "text-rank-good" : s.epa < -0.15 ? "text-rank-bad" : "text-foreground"
                  }`}
                >
                  {signed(s.epa)}
                </span>
                <span className="text-xs tabular-nums text-muted">
                  {s.plays} plays · {formatPercent(s.shareOfDropbacks)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
