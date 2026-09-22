"use client";

import { useMemo } from "react";
import type { PriorSeasonSnapshot, TeamStatSnapshot } from "@/lib/data/types";
import { StatCard } from "@/components/shared/StatCard";
import { StatWindowSelector } from "@/components/shared/StatWindowSelector";
import { useWindowParam } from "@/lib/hooks/useWindowParam";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent } from "@/lib/util/format";

// Every per-play card follows the window selector. Point differential
// stays season-to-date on purpose — it's a cumulative box-score total,
// so "last N weeks point differential" would be a different stat rather
// than the same one over a shorter span — and says so on the card when a
// window is active, rather than silently showing season numbers.
export function TeamStrengthSection({
  teamStats,
  priorSeason,
  initialWindow,
}: {
  teamStats: TeamStatSnapshot;
  priorSeason?: PriorSeasonSnapshot | null;
  initialWindow?: string;
}) {
  const priorKey = priorSeason ? `season-${priorSeason.season}` : null;
  const options = useMemo(
    () => [
      { key: "season", label: "Full Season" },
      ...teamStats.epaPerPlayWindows.map((w) => ({ key: w.key, label: w.label })),
      ...(priorSeason ? [{ key: `season-${priorSeason.season}`, label: `${priorSeason.season} Season` }] : []),
    ],
    [teamStats.epaPerPlayWindows, priorSeason]
  );
  const [selected, setSelected] = useWindowParam("teamWindow", initialWindow, "season");
  const isPrior = priorKey !== null && selected === priorKey;
  const window = teamStats.epaPerPlayWindows.find((w) => w.key === selected);

  // Every per-play metric follows the selector. Previously only the two
  // EPA cards did, so choosing "Last Week" left success rate and
  // yards/play showing full-season numbers under a selector that said
  // otherwise. A completed prior season is just another source of the
  // same three metric groups.
  // Three possible sources, normalised to one shape. The live windows
  // carry EPA as top-level offense/defense; the prior-season snapshot
  // nests it under epaPerPlay like the season default does.
  const view =
    isPrior && priorSeason
      ? priorSeason.teamStrength
      : window
        ? {
            epaPerPlay: { offense: window.offense, defense: window.defense },
            successRate: window.successRate,
            yardsPerPlay: window.yardsPerPlay,
          }
        : {
            epaPerPlay: teamStats.epaPerPlay,
            successRate: teamStats.successRate,
            yardsPerPlay: teamStats.yardsPerPlay,
          };
  const epa = view.epaPerPlay;
  const successRate = view.successRate;
  const yardsPerPlay = view.yardsPerPlay;
  const windowLabel = isPrior ? `${priorSeason?.season} season` : (window?.label ?? null);

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
          soWhat={
            windowLabel
              ? `Season to date — point differential is a cumulative total, not a per-play rate.`
              : `Pythagorean win% suggests a ${formatPercent(teamStats.pythagoreanWinPct)} true-talent team.`
          }
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
        <StatCard
          label="Offensive Success Rate"
          value={formatPercent(successRate.offense.value)}
          leagueRank={successRate.offense.leagueRank}
          soWhat="Share of plays that kept the offense ahead of down-and-distance expectations."
          animate={{ value: successRate.offense.value * 100, suffix: "%" }}
        />
        <StatCard
          label="Defensive Success Rate"
          value={formatPercent(successRate.defense.value)}
          leagueRank={successRate.defense.leagueRank}
          soWhat="Share of opponent plays allowed to succeed — lower is better here."
          animate={{ value: successRate.defense.value * 100, suffix: "%" }}
        />
        <StatCard
          label="Offensive Yards/Play"
          value={yardsPerPlay.offense.value.toFixed(1)}
          leagueRank={yardsPerPlay.offense.leagueRank}
          animate={{ value: yardsPerPlay.offense.value, decimals: 1 }}
        />
        <StatCard
          label="Defensive Yards/Play"
          value={yardsPerPlay.defense.value.toFixed(1)}
          leagueRank={yardsPerPlay.defense.leagueRank}
          soWhat="Fewer yards allowed per snap is better here."
          animate={{ value: yardsPerPlay.defense.value, decimals: 1 }}
        />
      </div>
    </div>
  );
}
