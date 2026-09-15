import { StatCard } from "@/components/shared/StatCard";
import { RecordAndStandingCard } from "@/components/home/RecordAndStandingCard";
import { PlayoffOddsCard } from "@/components/home/PlayoffOddsCard";
import { CountdownCard } from "@/components/home/CountdownCard";
import { GameResultCard } from "@/components/home/GameResultCard";
import { HeadlinesList } from "@/components/home/HeadlinesList";
import * as store from "@/lib/data/store";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent } from "@/lib/util/format";

export default async function HomePage() {
  const [team, teamStats, schedule, projection, nextGame, lastGame, news] =
    await Promise.all([
      store.getTeam(),
      store.getTeamStats(),
      store.getSchedule(),
      store.getSeasonProjection(),
      store.getNextGame(),
      store.getLastGame(),
      store.getNews(),
    ]);

  return (
    <div className="-mx-4 space-y-8 sm:mx-0">
      <div className="bg-gradient-to-br from-navy via-navy to-navy-deep px-4 py-6 sm:rounded-xl sm:px-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
          {team.name}
        </h1>
        <p className="text-sm text-white/70">
          Season {teamStats.season} dashboard
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RecordAndStandingCard schedule={schedule} />
          <PlayoffOddsCard projection={projection} />
          <CountdownCard game={nextGame} />
          <GameResultCard game={lastGame} />
        </div>
      </div>

      <div className="px-4 sm:px-0">
        <h2 className="mb-3 text-lg font-semibold">Team Strength vs. League</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Point Differential"
            value={`${teamStats.pointDifferential.value > 0 ? "+" : ""}${teamStats.pointDifferential.value}`}
            leagueRank={teamStats.pointDifferential.leagueRank}
            soWhat={`Pythagorean win% suggests a ${formatPercent(teamStats.pythagoreanWinPct)} true-talent team.`}
          />
          <StatCard
            label="Offensive EPA/play"
            value={teamStats.epaPerPlay.offense.value.toFixed(2)}
            leagueRank={teamStats.epaPerPlay.offense.leagueRank}
            soWhat={`${ordinal(teamStats.epaPerPlay.offense.leagueRank)}-ranked offense by the metric that best predicts scoring.`}
          />
          <StatCard
            label="Defensive EPA/play"
            value={teamStats.epaPerPlay.defense.value.toFixed(2)}
            leagueRank={teamStats.epaPerPlay.defense.leagueRank}
            soWhat={`${ordinal(teamStats.epaPerPlay.defense.leagueRank)}-ranked defense — negative is good here.`}
          />
        </div>
      </div>

      <div className="px-4 sm:px-0">
        <h2 className="mb-3 text-lg font-semibold">Latest Headlines</h2>
        <HeadlinesList items={news} />
      </div>
    </div>
  );
}
