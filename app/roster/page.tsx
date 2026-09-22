import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { DepthChartTable } from "@/components/roster/DepthChartTable";
import { PositionGroupCardsGrid } from "@/components/roster/PositionGroupCardsGrid";
import { SpecialTeamsStats } from "@/components/roster/SpecialTeamsStats";
import { SituationalSplitsTable } from "@/components/roster/SituationalSplitsTable";
import { QBDeepDive } from "@/components/roster/QBDeepDive";
import { QbHeadToHead } from "@/components/roster/QbHeadToHead";
import { Tabs } from "@/components/shared/Tabs";

export const metadata: Metadata = { title: "Roster & Stats" };

export default async function RosterPage() {
  const [chart, reportCards, teamStats, qb, qbLeagueTable, nextGame] = await Promise.all([
    store.getDepthChart(),
    store.getPositionGroupReportCards(),
    store.getTeamStats(),
    store.getQBDeepDive(),
    store.getQbLeagueTable(),
    store.getNextGame(),
  ]);
  const opponentTeam = nextGame.homeTeam === qb.team ? nextGame.awayTeam : nextGame.homeTeam;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">Roster & Stats</h1>
        <p className="text-sm text-muted">
          Depth chart, position-group grades vs. league, and situational
          splits.
        </p>
      </div>

      <Tabs
        tabs={[
          {
            label: "QB",
            content: (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 text-lg font-semibold">QB Deep Dive</h2>
                  <QBDeepDive qb={qb} />
                </div>
                <div>
                  <h2 className="mb-3 text-lg font-semibold">Head-to-Head</h2>
                  <QbHeadToHead maye={qb} league={qbLeagueTable} defaultOpponentTeam={opponentTeam} />
                </div>
              </div>
            ),
          },
          {
            label: "Position Grades",
            content: <PositionGroupCardsGrid cards={reportCards} />,
          },
          {
            label: "Splits & Special Teams",
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
