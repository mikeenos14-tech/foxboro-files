import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { DepthChartTable } from "@/components/roster/DepthChartTable";
import { PositionGroupReportCard } from "@/components/roster/PositionGroupReportCard";
import { SpecialTeamsStats } from "@/components/roster/SpecialTeamsStats";
import { SituationalSplitsTable } from "@/components/roster/SituationalSplitsTable";
import { QBDeepDive } from "@/components/roster/QBDeepDive";
import { QbHeadToHead } from "@/components/roster/QbHeadToHead";

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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">Roster & Stats</h1>
        <p className="text-sm text-muted">
          Depth chart, position-group grades vs. league, and situational
          splits.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">QB Deep Dive</h2>
        <QBDeepDive qb={qb} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Head-to-Head</h2>
        <QbHeadToHead maye={qb} league={qbLeagueTable} defaultOpponentTeam={opponentTeam} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Position Group Report Cards
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((card) => (
            <PositionGroupReportCard key={card.group} card={card} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Situational Splits</h2>
        <SituationalSplitsTable stats={teamStats} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Special Teams</h2>
        <SpecialTeamsStats specialTeams={teamStats.specialTeams} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Depth Chart</h2>
        <DepthChartTable chart={chart} />
      </div>
    </div>
  );
}
