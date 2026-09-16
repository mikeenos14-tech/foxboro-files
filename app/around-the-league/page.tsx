import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { LeagueEpaRankings } from "@/components/league/LeagueEpaRankings";
import { LastWeekScores } from "@/components/league/LastWeekScores";
import { AllDivisionStandings } from "@/components/league/AllDivisionStandings";
import { HeadlinesList } from "@/components/home/HeadlinesList";

export const metadata: Metadata = { title: "Around the League" };

export default async function AroundTheLeaguePage() {
  const [epaRankings, scoreboard, standings, news] = await Promise.all([
    store.getLeagueEpaRankings(),
    store.getLeagueScoreboard(),
    store.getLeagueStandings(),
    store.getLeagueNews(),
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

      <div>
        <h2 className="mb-3 text-lg font-semibold">NFL Power Rankings</h2>
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
