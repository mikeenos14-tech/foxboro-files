import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { LastWeekScores } from "@/components/league/LastWeekScores";
import { AllDivisionStandings } from "@/components/league/AllDivisionStandings";
import { HeadlinesList } from "@/components/home/HeadlinesList";
import { UnitRankings, type TeamView } from "@/components/league/UnitRankings";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent, signed } from "@/lib/util/format";
import type { LeagueEpaRanking } from "@/lib/data/types";

export const metadata: Metadata = { title: "Around the League" };

// Whole offense and whole defense, as two more choices in the unit
// picker — they used to be two separate 32-row tables below it.
function teamView(rankings: LeagueEpaRanking[], side: "offense" | "defense"): TeamView {
  const epa = side === "offense" ? "offenseEpa" : "defenseEpa";
  const rank = side === "offense" ? "offenseRank" : "defenseRank";
  const success = side === "offense" ? "offenseSuccess" : "defenseSuccess";
  const successRank = side === "offense" ? "offenseSuccessRank" : "defenseSuccessRank";
  return {
    key: side === "offense" ? "Offense" : "Defense",
    columns: [side === "offense" ? "EPA/play" : "EPA allowed", side === "offense" ? "Success" : "Success allowed"],
    rows: [...rankings]
      .sort((a, b) => a[rank] - b[rank])
      .map((r) => ({
        team: r.team,
        main: signed(r[epa], 2),
        side: `${formatPercent(r[success])} (${ordinal(r[successRank])})`,
      })),
    note:
      "Ranked by EPA per play (how much a team gains per play), adjusted for opponents, 2026 games only. Success is how often a play improved the chances of scoring, with its own rank." +
      (side === "defense" ? " For a defense, lower is better on both." : ""),
  };
}

export default async function AroundTheLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>;
}) {
  const { unit } = await searchParams;
  const [epaRankings, scoreboard, standings, news, unitTable, reportCards] = await Promise.all([
    store.getLeagueEpaRankings(),
    store.getLeagueScoreboard(),
    store.getLeagueStandings(),
    store.getLeagueNews(),
    store.getPositionGroupLeagueTable(),
    store.getPositionGroupReportCards(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">
          Around the League
        </h1>
        <p className="text-sm text-muted">
          What&apos;s happening across the rest of the NFL.
        </p>
      </div>

      <div id="units" className="scroll-mt-20">
        <h2 className="text-lg font-semibold">Every Team, Ranked</h2>
        <p className="mb-3 text-sm text-muted">
          Pick the whole offense, the whole defense or one unit to see where all 32 teams rank —
          New England is highlighted.
        </p>
        <UnitRankings
          league={unitTable}
          highlightTeam="NE"
          noisyUnits={reportCards.filter((c) => c.noisyMetric).map((c) => c.group)}
          initialUnit={unit}
          teamViews={[teamView(epaRankings, "offense"), teamView(epaRankings, "defense")]}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Last Week&apos;s Scores</h2>
        <LastWeekScores games={scoreboard} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Division Standings</h2>
        <AllDivisionStandings groups={standings} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Around the League Headlines</h2>
        <HeadlinesList items={news} limit={10} />
      </div>
    </div>
  );
}
