"use client";

import { useEffect, useMemo, useRef } from "react";
import type { PositionGroupLeagueTeamEntry } from "@/lib/data/types";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { PercentBar } from "@/components/shared/PercentBar";
import { useWindowParam } from "@/lib/hooks/useWindowParam";
import { ordinal } from "@/lib/calc/ranks";
import { formatUnitRate } from "@/lib/util/format";
import { tabKeyTarget } from "@/lib/util/tabKeys";

// Every team's grade for one unit, ranked — "how does our pass defense
// compare to the rest of the league" answered directly, instead of one
// opponent at a time in the Roster compare tool. The grades were already
// computed for all 32 teams (position-group-league-table.json); nothing
// showed them.
//
// One unit at a time rather than a 32×8 grid: a grid is unreadable on a
// phone, and the question people actually ask is about one unit. The
// choice lives in the URL (?unit=), so Home's grade chips link straight
// to the right ranking.
//
// Whole-team offense and defense ride in the same picker (teamViews)
// rather than as two more 32-row tables below it: one table, one way to
// use it, and three fewer phone screens of scrolling.
export interface TeamView {
  key: string;
  /** Column headings for the two numbers. */
  columns: [string, string];
  /** Already ranked, best first. */
  rows: Array<{ team: string; main: string; side: string; bar?: number }>;
  note: string;
}

export function UnitRankings({
  league,
  highlightTeam,
  noisyUnits,
  initialUnit,
  teamViews = [],
}: {
  league: PositionGroupLeagueTeamEntry[];
  highlightTeam: string;
  noisyUnits: string[];
  initialUnit?: string;
  teamViews?: TeamView[];
}) {
  const unitGroups = league[0]?.groups.map((g) => g.group) ?? [];
  const units = [...teamViews.map((v) => v.key), ...unitGroups];
  const validInitial = units.includes(initialUnit ?? "") ? initialUnit : undefined;
  const [unit, setUnit] = useWindowParam("unit", validInitial, units[0] ?? "");
  // Arriving from a link (e.g. Home's "Pass Defense" chip), the chosen
  // unit can sit off-screen in the phone's sideways-scrolling strip.
  const selectedRef = useRef<HTMLButtonElement>(null);
  // Sideways only — scrollIntoView would also move the page itself.
  useEffect(() => {
    const button = selectedRef.current;
    const strip = button?.parentElement;
    if (!button || !strip) return;
    strip.scrollLeft = button.offsetLeft - (strip.clientWidth - button.clientWidth) / 2;
  }, [unit]);

  const view: TeamView | null = useMemo(() => {
    const teamView = teamViews.find((v) => v.key === unit);
    if (teamView) return teamView;
    const ranked = league
      .map((t) => ({ team: t.team, entry: t.groups.find((g) => g.group === unit) }))
      .filter((r): r is { team: string; entry: NonNullable<typeof r.entry> } => r.entry !== undefined)
      .sort((a, b) => b.entry.grade - a.entry.grade);
    if (ranked.length === 0) return null;
    const rateLabel = ranked[0].entry.rawLabel;
    return {
      key: unit,
      columns: ["Grade", rateLabel.charAt(0).toUpperCase() + rateLabel.slice(1)],
      rows: ranked.map((r) => ({
        team: r.team,
        main: String(r.entry.grade),
        side: formatUnitRate(r.entry.rawLabel, r.entry.rawValue),
        bar: r.entry.grade,
      })),
      note:
        "Grades are out of 100 (100 = best in the NFL), adjusted for each team's opponents, 2026 games only. The right-hand column is the team's actual rate, unadjusted." +
        (noisyUnits.includes(unit)
          ? ` ${unit} is a noisy stat — teams separate slowly even over a full season, so read nearby ranks as a tier, not an order.`
          : ""),
    };
  }, [league, unit, teamViews, noisyUnits]);
  if (!view) return null;

  return (
    <div className="lift overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative border-b border-border">
        <div
          role="tablist"
          className="relative flex gap-1 overflow-x-auto p-2 sm:flex-wrap"
          onKeyDown={(e) => {
            const next = tabKeyTarget(e, units.indexOf(unit), units.length);
            if (next !== null) setUnit(units[next]);
          }}
        >
          {units.map((u) => (
            <button
              key={u}
              ref={unit === u ? selectedRef : undefined}
              role="tab"
              aria-selected={unit === u}
              tabIndex={unit === u ? 0 : -1}
              onClick={() => setUnit(u)}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                unit === u ? "bg-red text-white" : "text-muted hover:bg-navy/10 hover:text-foreground"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent sm:hidden" />
      </div>

      <div className="flex items-center gap-3 px-4 pb-1 pt-3 text-[11px] uppercase tracking-wide text-muted">
        <span className="w-8">Rank</span>
        <span className="flex-1">Team</span>
        <span className="w-14 text-right normal-case tracking-normal">{view.columns[0]}</span>
        <span className="w-24 text-right normal-case tracking-normal">{view.columns[1]}</span>
      </div>
      <ol>
        {view.rows.map((r, i) => {
          const isUs = r.team === highlightTeam;
          return (
            <li
              key={r.team}
              className={`flex items-center gap-3 px-4 py-1.5 text-sm ${
                isUs ? "bg-red/10 font-semibold" : ""
              }`}
            >
              <span className={`w-8 tabular-nums ${isUs ? "text-foreground" : "text-muted"}`}>
                {ordinal(i + 1)}
              </span>
              <span className="flex flex-1 items-center gap-2">
                <TeamLogo team={r.team} size={20} />
                <span className="w-10 text-foreground">{r.team}</span>
                {r.bar !== undefined && <PercentBar value={r.bar} className="hidden max-w-40 sm:block" />}
              </span>
              <span className="w-14 text-right tabular-nums text-foreground">{r.main}</span>
              <span className="w-24 text-right text-xs tabular-nums text-muted">{r.side}</span>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-border px-4 py-2 text-[11px] text-muted">{view.note}</p>
    </div>
  );
}
