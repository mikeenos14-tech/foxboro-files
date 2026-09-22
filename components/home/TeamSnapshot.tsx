"use client";

import { useMemo } from "react";
import type {
  PositionGroupReportCard,
  PriorSeasonSnapshot,
  TeamStatSnapshot,
} from "@/lib/data/types";
import { CountUp } from "@/components/shared/CountUp";
import { MetricComparisonTable } from "@/components/shared/MetricComparisonTable";
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

      {/* Point differential is the one summary number, so it gets to be
          the headline rather than one of seven identical tiles. */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted">Point Differential</div>
          <div className="font-display text-4xl font-semibold tabular-nums text-foreground">
            {pointDifferential.value > 0 ? "+" : ""}
            <CountUp value={pointDifferential.value} />
          </div>
        </div>
        <div className="text-sm text-muted sm:flex-1 sm:border-l sm:border-border sm:pl-4">
          <span className="font-medium text-foreground">
            {ordinal(pointDifferential.leagueRank)} in the NFL
          </span>
          {!windowLabel && (
            <>
              {" · "}
              Pythagorean win% suggests a {formatPercent(teamStats.pythagoreanWinPct)} true-talent team.
            </>
          )}
        </div>
      </div>

      <MetricComparisonTable
        rows={[
          {
            label: "EPA / play",
            offense: epa.offense,
            defense: epa.defense,
            format: (v) => v.toFixed(2),
          },
          {
            label: "Success rate",
            offense: successRate.offense,
            defense: successRate.defense,
            format: (v) => formatPercent(v),
          },
          {
            label: "Yards / play",
            offense: yardsPerPlay.offense,
            defense: yardsPerPlay.defense,
            format: (v) => v.toFixed(1),
          },
        ]}
      />
    </div>
  );
}
