"use client";

import { useMemo } from "react";
import type {
  PositionGroupReportCard,
  PriorSeasonSnapshot,
  TeamStatSnapshot,
} from "@/lib/data/types";
import { StatCard } from "@/components/shared/StatCard";
import { StatWindowSelector } from "@/components/shared/StatWindowSelector";
import { PositionGroupSummaryStrip } from "@/components/roster/PositionGroupSummaryStrip";
import { useWindowParam } from "@/lib/hooks/useWindowParam";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent } from "@/lib/util/format";

// One filter for the whole snapshot: every number under this control
// responds to it, with no exceptions. Getting there took two passes —
// first the selector only moved two of seven cards, then the Unit Grades
// strip sat frozen directly above it, then point differential stayed
// season-to-date behind a justification that was really just an excuse
// for not implementing it. A filter that moves some of what it sits above
// is worse than no filter, because it silently mislabels whatever it
// didn't touch.
export function TeamSnapshot({
  teamStats,
  cards,
  priorSeason,
  initialWindow,
}: {
  teamStats: TeamStatSnapshot;
  cards: PositionGroupReportCard[];
  priorSeason?: PriorSeasonSnapshot | null;
  initialWindow?: string;
}) {
  const priorKey = priorSeason ? `season-${priorSeason.season}` : null;

  const options = useMemo(
    () => [
      { key: "season", label: "Full Season" },
      ...teamStats.epaPerPlayWindows.map((w) => ({ key: w.key, label: w.label })),
      ...(priorSeason
        ? [{ key: `season-${priorSeason.season}`, label: `${priorSeason.season} Season` }]
        : []),
    ],
    [teamStats.epaPerPlayWindows, priorSeason]
  );

  const [selected, setSelected] = useWindowParam("teamWindow", initialWindow, "season");
  const isPrior = priorKey !== null && selected === priorKey;
  const window = teamStats.epaPerPlayWindows.find((w) => w.key === selected);
  const windowLabel = isPrior ? `${priorSeason?.season} season` : (window?.label ?? null);

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
            pointDifferential: window.pointDifferential,
          }
        : {
            epaPerPlay: teamStats.epaPerPlay,
            successRate: teamStats.successRate,
            yardsPerPlay: teamStats.yardsPerPlay,
            pointDifferential: teamStats.pointDifferential,
          };
  const { epaPerPlay: epa, successRate, yardsPerPlay, pointDifferential } = view;

  // Team stats window by calendar week (required for opponent adjustment
  // to stay valid across teams); position grades window by the team's own
  // games. At the same N these describe the same stretch unless a bye
  // falls inside it, in which case the grade window reaches back one game
  // further. Acceptable for a summary strip — the Roster page's full
  // breakdown uses exact game windows either way.
  const gradeCards = useMemo(() => {
    if (selected === "season") return cards;
    if (isPrior && priorSeason) {
      return cards.map((c) => {
        const p = priorSeason.positionGroups.find((g) => g.group === c.group);
        return p ? { ...c, grade: p.grade } : c;
      });
    }
    const n = Number(selected.match(/^last-(\d+)-weeks$/)?.[1]);
    if (!Number.isFinite(n)) return cards;
    return cards.map((c) => {
      const w = c.windows.find((x) => x.key === `last-${n}`) ?? c.windows[c.windows.length - 1];
      return w ? { ...c, grade: w.grade } : c;
    });
  }, [cards, selected, isPrior, priorSeason]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Team Snapshot</h2>
        {options.length > 1 && (
          <StatWindowSelector
            options={options}
            value={selected}
            onChange={setSelected}
            label="Show stats for"
            hideLabelVisually
          />
        )}
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Unit Grades</h3>
          <a href="/roster" className="text-xs text-muted underline hover:text-foreground">
            Full breakdown →
          </a>
        </div>
        <PositionGroupSummaryStrip cards={gradeCards} />
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Overall</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Point Differential"
              value={`${pointDifferential.value > 0 ? "+" : ""}${pointDifferential.value}`}
              leagueRank={pointDifferential.leagueRank}
              soWhat={
                windowLabel
                  ? undefined
                  : `Pythagorean win% suggests a ${formatPercent(teamStats.pythagoreanWinPct)} true-talent team.`
              }
              animate={{
                value: pointDifferential.value,
                prefix: pointDifferential.value > 0 ? "+" : "",
              }}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Offense</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="EPA/play"
              value={epa.offense.value.toFixed(2)}
              leagueRank={epa.offense.leagueRank}
              soWhat={`${ordinal(epa.offense.leagueRank)}-ranked by the metric that best predicts scoring.`}
              animate={{ value: epa.offense.value, decimals: 2 }}
            />
            <StatCard
              label="Success Rate"
              value={formatPercent(successRate.offense.value)}
              leagueRank={successRate.offense.leagueRank}
              soWhat="Share of plays that stayed ahead of down-and-distance expectations."
              animate={{ value: successRate.offense.value * 100, suffix: "%" }}
            />
            <StatCard
              label="Yards/Play"
              value={yardsPerPlay.offense.value.toFixed(1)}
              leagueRank={yardsPerPlay.offense.leagueRank}
              animate={{ value: yardsPerPlay.offense.value, decimals: 1 }}
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Defense</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="EPA/play allowed"
              value={epa.defense.value.toFixed(2)}
              leagueRank={epa.defense.leagueRank}
              soWhat={`${ordinal(epa.defense.leagueRank)}-ranked — negative is good here.`}
              animate={{ value: epa.defense.value, decimals: 2 }}
            />
            <StatCard
              label="Success Rate allowed"
              value={formatPercent(successRate.defense.value)}
              leagueRank={successRate.defense.leagueRank}
              soWhat="Share of opponent plays allowed to succeed — lower is better."
              animate={{ value: successRate.defense.value * 100, suffix: "%" }}
            />
            <StatCard
              label="Yards/Play allowed"
              value={yardsPerPlay.defense.value.toFixed(1)}
              leagueRank={yardsPerPlay.defense.leagueRank}
              animate={{ value: yardsPerPlay.defense.value, decimals: 1 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
