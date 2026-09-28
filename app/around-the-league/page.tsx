import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { LeagueEpaRankings } from "@/components/league/LeagueEpaRankings";
import { LastWeekScores } from "@/components/league/LastWeekScores";
import { AllDivisionStandings } from "@/components/league/AllDivisionStandings";
import { HeadlinesList } from "@/components/home/HeadlinesList";
import { UnitRankings } from "@/components/league/UnitRankings";

export const metadata: Metadata = { title: "Around the League" };

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
        <h2 className="text-lg font-semibold">Every Team, Every Unit</h2>
        <p className="mb-3 text-sm text-muted">
          Pick a unit to see where all 32 teams rank — New England is highlighted.
        </p>
        <UnitRankings
          league={unitTable}
          highlightTeam="NE"
          noisyUnits={reportCards.filter((c) => c.noisyMetric).map((c) => c.group)}
          initialUnit={unit}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Offense &amp; Defense Rankings</h2>
        <LeagueEpaRankings rankings={epaRankings} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Last Week&apos;s Scores</h2>
        <LastWeekScores games={scoreboard} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">All Division Standings</h2>
        <AllDivisionStandings groups={standings} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Around the League Headlines</h2>
        <HeadlinesList items={news} limit={10} />
      </div>
    </div>
  );
}
