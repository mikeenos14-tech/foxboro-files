"use client";

import { Fragment, useMemo, useState } from "react";
import type { QBDeepDive } from "@/lib/data/types";
import { PlayerHeadshot } from "@/components/shared/PlayerHeadshot";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { Legend } from "@/components/shared/Legend";
import { formatPercent, signed } from "@/lib/util/format";

interface Props {
  maye: QBDeepDive;
  league: QBDeepDive[];
  /** Preselects this week's opponent's starter when present in league, so the section opens already showing something relevant instead of an empty picker. */
  defaultOpponentTeam?: string;
}

interface Row {
  label: string;
  mayeDisplay: string;
  oppDisplay: string;
  mayeRaw: number;
  oppRaw: number;
  // Omitted for pure volume stats (attempts, yards) where "higher" isn't
  // really a quality signal — those rows show plain, uncolored numbers.
  higherIsBetter?: boolean;
}

interface Section {
  title: string;
  rows: Row[];
}

function buildSections(maye: QBDeepDive, opp: QBDeepDive): Section[] {
  return [
    {
      title: "Box Score",
      rows: [
        {
          label: "Comp/Att",
          mayeDisplay: `${maye.completions}/${maye.attempts}`,
          oppDisplay: `${opp.completions}/${opp.attempts}`,
          mayeRaw: 0,
          oppRaw: 0,
        },
        {
          label: "Comp %",
          mayeDisplay: maye.attempts > 0 ? formatPercent(maye.completions / maye.attempts, 1) : "—",
          oppDisplay: opp.attempts > 0 ? formatPercent(opp.completions / opp.attempts, 1) : "—",
          mayeRaw: maye.attempts > 0 ? maye.completions / maye.attempts : 0,
          oppRaw: opp.attempts > 0 ? opp.completions / opp.attempts : 0,
          higherIsBetter: true,
        },
        { label: "Yards", mayeDisplay: `${maye.yards}`, oppDisplay: `${opp.yards}`, mayeRaw: 0, oppRaw: 0 },
        {
          label: "TD",
          mayeDisplay: `${maye.tds}`,
          oppDisplay: `${opp.tds}`,
          mayeRaw: maye.tds,
          oppRaw: opp.tds,
          higherIsBetter: true,
        },
        {
          label: "INT",
          mayeDisplay: `${maye.ints}`,
          oppDisplay: `${opp.ints}`,
          mayeRaw: maye.ints,
          oppRaw: opp.ints,
          higherIsBetter: false,
        },
      ],
    },
    {
      title: "Efficiency & Advanced",
      rows: [
        {
          label: "CPOE",
          mayeDisplay: signed(maye.cpoe, 1),
          oppDisplay: signed(opp.cpoe, 1),
          mayeRaw: maye.cpoe,
          oppRaw: opp.cpoe,
          higherIsBetter: true,
        },
        {
          label: "Turnover-worthy rate",
          mayeDisplay: formatPercent(maye.turnoverWorthyPlayRate, 1),
          oppDisplay: formatPercent(opp.turnoverWorthyPlayRate, 1),
          mayeRaw: maye.turnoverWorthyPlayRate,
          oppRaw: opp.turnoverWorthyPlayRate,
          higherIsBetter: false,
        },
        {
          label: "Clean pocket EPA",
          mayeDisplay: signed(maye.cleanPocketEpa),
          oppDisplay: signed(opp.cleanPocketEpa),
          mayeRaw: maye.cleanPocketEpa,
          oppRaw: opp.cleanPocketEpa,
          higherIsBetter: true,
        },
        {
          label: "Under pressure EPA",
          mayeDisplay: signed(maye.pressureEpa),
          oppDisplay: signed(opp.pressureEpa),
          mayeRaw: maye.pressureEpa,
          oppRaw: opp.pressureEpa,
          higherIsBetter: true,
        },
      ],
    },
    {
      title: "Accuracy by Depth",
      rows: [
        {
          label: "Short (0-9 yds)",
          mayeDisplay: formatPercent(maye.accuracyByDepth.short),
          oppDisplay: formatPercent(opp.accuracyByDepth.short),
          mayeRaw: maye.accuracyByDepth.short,
          oppRaw: opp.accuracyByDepth.short,
          higherIsBetter: true,
        },
        {
          label: "Medium (10-19 yds)",
          mayeDisplay: formatPercent(maye.accuracyByDepth.medium),
          oppDisplay: formatPercent(opp.accuracyByDepth.medium),
          mayeRaw: maye.accuracyByDepth.medium,
          oppRaw: opp.accuracyByDepth.medium,
          higherIsBetter: true,
        },
        {
          label: "Deep (20+ yds)",
          mayeDisplay: formatPercent(maye.accuracyByDepth.deep),
          oppDisplay: formatPercent(opp.accuracyByDepth.deep),
          mayeRaw: maye.accuracyByDepth.deep,
          oppRaw: opp.accuracyByDepth.deep,
          higherIsBetter: true,
        },
      ],
    },
  ];
}

function QbHeaderCard({ qb, align }: { qb: QBDeepDive; align: "left" | "right" }) {
  const info = (
    <div className={align === "right" ? "text-right" : undefined}>
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {align === "left" && <TeamLogo team={qb.team} size={14} />}
        <span className="text-xs font-medium text-muted">{qb.team}</span>
        {align === "right" && <TeamLogo team={qb.team} size={14} />}
      </div>
      <div className="text-sm font-bold text-foreground">{qb.playerName}</div>
    </div>
  );
  const headshot = <PlayerHeadshot name={qb.playerName} imageUrl={qb.headshotUrl} size={40} />;
  return (
    <div className="flex items-center gap-2">
      {align === "left" ? (
        <>
          {headshot}
          {info}
        </>
      ) : (
        <>
          {info}
          {headshot}
        </>
      )}
    </div>
  );
}

export function QbHeadToHead({ maye, league, defaultOpponentTeam }: Props) {
  const opponents = useMemo(
    () => league.filter((q) => q.team !== maye.team).sort((a, b) => a.team.localeCompare(b.team)),
    [league, maye.team]
  );

  const [selectedTeam, setSelectedTeam] = useState<string | undefined>(() => {
    if (defaultOpponentTeam && opponents.some((q) => q.team === defaultOpponentTeam)) {
      return defaultOpponentTeam;
    }
    return opponents[0]?.team;
  });

  const opp = opponents.find((q) => q.team === selectedTeam);

  if (!opp) {
    return (
      <div className="lift rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted">No other QB data available yet to compare against.</p>
      </div>
    );
  }

  const sections = buildSections(maye, opp);

  return (
    <div className="lift rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <QbHeaderCard qb={maye} align="left" />
        <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-muted">vs.</span>
        <QbHeaderCard qb={opp} align="right" />
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-muted">Compare against</span>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-red focus:outline-none"
        >
          {opponents.map((q) => (
            <option key={q.team} value={q.team}>
              {q.team} — {q.playerName}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.title}>
                <tr>
                  <td colSpan={3} className="pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted">
                    {section.title}
                  </td>
                </tr>
                {section.rows.map((row) => {
                  const tie = row.higherIsBetter === undefined || row.mayeRaw === row.oppRaw;
                  const mayeWins =
                    !tie && (row.higherIsBetter ? row.mayeRaw > row.oppRaw : row.mayeRaw < row.oppRaw);
                  const oppWins = !tie && !mayeWins;
                  return (
                    <tr key={row.label} className="border-t border-border">
                      <td className="py-2 pr-2 text-xs text-muted">{row.label}</td>
                      <td
                        className={`py-2 text-right tabular-nums ${
                          mayeWins ? "font-bold text-rank-good" : "text-foreground"
                        }`}
                      >
                        {row.mayeDisplay}
                      </td>
                      <td
                        className={`py-2 pl-4 text-right tabular-nums ${
                          oppWins ? "font-bold text-rank-good" : "text-foreground"
                        }`}
                      >
                        {row.oppDisplay}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <Legend
        className="-mx-4 -mb-4 mt-4 rounded-b-lg border-t border-border bg-background/50"
        items={[
          { term: "CPOE", definition: "completion % over expected" },
          { term: "EPA", definition: "expected points added per play" },
        ]}
      />
    </div>
  );
}
