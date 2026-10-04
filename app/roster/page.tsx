import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { DepthChartTable } from "@/components/roster/DepthChartTable";
import { PositionGroupCardsGrid } from "@/components/roster/PositionGroupCardsGrid";
import { PositionGroupHeadToHead } from "@/components/roster/PositionGroupHeadToHead";
import { Leaderboards } from "@/components/roster/Leaderboards";
import { SpecialTeamsStats } from "@/components/roster/SpecialTeamsStats";
import { DisciplineStats } from "@/components/roster/DisciplineStats";
import { SituationalSplitsTable } from "@/components/roster/SituationalSplitsTable";
import { QBDeepDive } from "@/components/roster/QBDeepDive";
import { QbHeadToHead } from "@/components/roster/QbHeadToHead";
import { Tabs } from "@/components/shared/Tabs";

export const metadata: Metadata = { title: "Stats" };

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ qbWindow?: string; gradeWindow?: string; tab?: string }>;
}) {
  const { qbWindow, gradeWindow, tab } = await searchParams;
  const [chart, reportCards, positionGroupLeagueTable, teamStats, qb, qbLeagueTable, nextGame, priorSeason, leaders] =
    await Promise.all([
      store.getDepthChart(),
      store.getPositionGroupReportCards(),
      store.getPositionGroupLeagueTable(),
      store.getTeamStats(),
      store.getQBDeepDive(),
      store.getQbLeagueTable(),
      store.getNextGame(),
      store.getPriorSeason(),
      store.getLeaderboards(),
    ]);
  const opponentTeam = nextGame.homeTeam === qb.team ? nextGame.awayTeam : nextGame.homeTeam;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">Stats</h1>
        <p className="text-sm text-muted">
          The quarterback, every unit graded against the league, team leaders and the depth chart.
        </p>
      </div>

      <Tabs
        initialTab={tab}
        paramKey="tab"
        tabs={[
          {
            label: "QB",
            content: (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 text-lg font-semibold">QB Deep Dive</h2>
                  <QBDeepDive qb={qb} priorSeason={priorSeason} initialWindow={qbWindow} />
                </div>
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Head-to-Head</h2>
                  <QbHeadToHead maye={qb} league={qbLeagueTable} defaultOpponentTeam={opponentTeam} />
                </div>
              </div>
            ),
          },
          {
            label: "Leaders",
            content: (
              <div>
                <h2 className="mb-3 text-lg font-semibold">Team Leaders</h2>
                <Leaderboards leaders={leaders} />
              </div>
            ),
          },
          {
            label: "Grades",
            content: (
              <div className="space-y-6">
                <PositionGroupCardsGrid
                  cards={reportCards}
                  priorSeason={priorSeason}
                  initialWindow={gradeWindow}
                />
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Compare a Position Group</h2>
                  <PositionGroupHeadToHead
                    myTeam={qb.team}
                    league={positionGroupLeagueTable}
                    defaultOpponentTeam={opponentTeam}
                  />
                </div>
              </div>
            ),
          },
          {
            label: "Splits",
            content: (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Situational Splits</h2>
                  <SituationalSplitsTable stats={teamStats} />
                </div>
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Special Teams</h2>
                  <SpecialTeamsStats specialTeams={teamStats.specialTeams} />
                </div>
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Discipline</h2>
                  <DisciplineStats discipline={teamStats.discipline} />
                </div>
              </div>
            ),
          },
          {
            label: "Depth Chart",
            content: <DepthChartTable chart={chart} />,
          },
        ]}
      />
    </div>
  );
}
