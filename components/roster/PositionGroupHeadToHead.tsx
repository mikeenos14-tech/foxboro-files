"use client";

import { useMemo, useState } from "react";
import type { PositionGroupLeagueTeamEntry } from "@/lib/data/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { Legend } from "@/components/shared/Legend";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent, signed } from "@/lib/util/format";

interface Props {
  myTeam: string;
  league: PositionGroupLeagueTeamEntry[];
  /** Preselects this week's opponent when present in league, same idea as QbHeadToHead. */
  defaultOpponentTeam?: string;
}

// Grade is a league percentile by construction (see build-roster-data.ts),
// always "higher is better" no matter the group — unlike QbHeadToHead,
// which has to track higherIsBetter per stat, comparing two teams here is
// just comparing the two grades directly.
// Matched on substring rather than the exact label: an exact `=== "EPA/play"`
// check silently fell through to the percent formatter the moment the
// label gained an "Adj." prefix, rendering -0.152 EPA/play as "-15.2%".
function formatRaw(rawLabel: string, rawValue: number): string {
  return rawLabel.includes("EPA") ? signed(rawValue, 2) : formatPercent(rawValue, 1);
}

export function PositionGroupHeadToHead({ myTeam, league, defaultOpponentTeam }: Props) {
  const mine = league.find((t) => t.team === myTeam);
  const opponents = useMemo(
    () => league.filter((t) => t.team !== myTeam).sort((a, b) => a.team.localeCompare(b.team)),
    [league, myTeam]
  );
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(() => {
    if (defaultOpponentTeam && opponents.some((t) => t.team === defaultOpponentTeam)) {
      return defaultOpponentTeam;
    }
    return opponents[0]?.team;
  });
  const opp = opponents.find((t) => t.team === selectedTeam);

  if (!mine || !opp) {
    return (
      <div className="lift rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted">No position-group data available yet to compare against.</p>
      </div>
    );
  }

  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TeamLogo team={mine.team} size={22} />
          <span className="text-sm font-bold text-foreground">{mine.team}</span>
        </div>
        <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-muted">vs.</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{opp.team}</span>
          <TeamLogo team={opp.team} size={22} />
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-muted">Compare against</span>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-red focus:outline-none"
        >
          {opponents.map((t) => (
            <option key={t.team} value={t.team}>
              {t.team}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {mine.groups.map((myGroup) => {
              const oppGroup = opp.groups.find((g) => g.group === myGroup.group);
              if (!oppGroup) return null;
              const tie = myGroup.grade === oppGroup.grade;
              const mineWins = !tie && myGroup.grade > oppGroup.grade;
              const oppWins = !tie && !mineWins;
              return (
                <tr key={myGroup.group} className="border-t border-border">
                  <td className="py-2 pr-2 text-xs text-muted">{myGroup.group}</td>
                  <td className="py-2 text-right tabular-nums">
                    <div className={mineWins ? "font-bold text-rank-good" : "text-foreground"}>
                      {ordinal(myGroup.grade)}
                    </div>
                    <div className="text-xs text-muted">{formatRaw(myGroup.rawLabel, myGroup.rawValue)}</div>
                  </td>
                  <td className="py-2 pl-4 text-right tabular-nums">
                    <div className={oppWins ? "font-bold text-rank-good" : "text-foreground"}>
                      {ordinal(oppGroup.grade)}
                    </div>
                    <div className="text-xs text-muted">{formatRaw(oppGroup.rawLabel, oppGroup.rawValue)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Legend
        className="-mx-4 -mb-4 mt-4 rounded-b-lg border-t border-border bg-background/50"
        items={[{ term: "Percentile", definition: "league rank at that group vs. all 32 teams — 100th = best" }]}
      />
    </div>
  );
}
