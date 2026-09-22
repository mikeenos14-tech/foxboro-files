"use client";

import { useMemo } from "react";
import type { TeamStatSnapshot } from "@/lib/data/types";
import { StatCard } from "@/components/shared/StatCard";
import { StatWindowSelector } from "@/components/shared/StatWindowSelector";
import { useWindowParam } from "@/lib/hooks/useWindowParam";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent } from "@/lib/util/format";

// Point differential/Pythagorean win% aren't windowed (they're simple
// season-to-date box-score totals, not something a "last N games" slice
// changes the meaning of the same way EPA does) — only the two EPA cards
// swap with the selector, so this owns just that piece of the section.
export function TeamStrengthSection({
  teamStats,
  initialWindow,
}: {
  teamStats: TeamStatSnapshot;
  initialWindow?: string;
}) {
  const options = useMemo(
    () => [{ key: "season", label: "Full Season" }, ...teamStats.epaPerPlayWindows.map((w) => ({ key: w.key, label: w.label }))],
    [teamStats.epaPerPlayWindows]
  );
  const [selected, setSelected] = useWindowParam("teamWindow", initialWindow, "season");
  const epa =
    selected === "season"
      ? teamStats.epaPerPlay
      : teamStats.epaPerPlayWindows.find((w) => w.key === selected) ?? teamStats.epaPerPlay;

  return (
    <div className="lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Team Strength vs. League</h2>
        {options.length > 1 && (
          <StatWindowSelector
            options={options}
            value={selected}
            onChange={setSelected}
            label="Show EPA for"
            hideLabelVisually
          />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Point Differential"
          value={`${teamStats.pointDifferential.value > 0 ? "+" : ""}${teamStats.pointDifferential.value}`}
          leagueRank={teamStats.pointDifferential.leagueRank}
          soWhat={`Pythagorean win% suggests a ${formatPercent(teamStats.pythagoreanWinPct)} true-talent team.`}
          animate={{
            value: teamStats.pointDifferential.value,
            prefix: teamStats.pointDifferential.value > 0 ? "+" : "",
          }}
        />
        <StatCard
          label="Offensive EPA/play"
          value={epa.offense.value.toFixed(2)}
          leagueRank={epa.offense.leagueRank}
          soWhat={`${ordinal(epa.offense.leagueRank)}-ranked offense by the metric that best predicts scoring.`}
          animate={{ value: epa.offense.value, decimals: 2 }}
        />
        <StatCard
          label="Defensive EPA/play"
          value={epa.defense.value.toFixed(2)}
          leagueRank={epa.defense.leagueRank}
          soWhat={`${ordinal(epa.defense.leagueRank)}-ranked defense — negative is good here.`}
          animate={{ value: epa.defense.value, decimals: 2 }}
        />
      </div>
    </div>
  );
}
