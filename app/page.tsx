import { StatCard } from "@/components/shared/StatCard";
import { RecordAndStandingCard } from "@/components/home/RecordAndStandingCard";
import { PlayoffOddsCard } from "@/components/home/PlayoffOddsCard";
import { CountdownCard } from "@/components/home/CountdownCard";
import { GameResultCard } from "@/components/home/GameResultCard";
import { HeadlinesList } from "@/components/home/HeadlinesList";
import { DivisionStandings } from "@/components/home/DivisionStandings";
import * as store from "@/lib/data/store";
import { ordinal } from "@/lib/calc/ranks";
import { formatPercent } from "@/lib/util/format";

export default async function HomePage() {
  const [teamStats, schedule, projection, nextGame, lastGame, news, standings] =
    await Promise.all([
      store.getTeamStats(),
      store.getSchedule(),
      store.getSeasonProjection(),
      store.getNextGame(),
      store.getLastGame(),
      store.getNews(),
      store.getDivisionStandings(),
    ]);

  return (
    <div className="-mx-4 space-y-8 sm:mx-0">
      <div className="hero-texture bg-gradient-to-br from-navy via-navy to-navy-deep px-4 py-6 sm:rounded-xl sm:px-6">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
          Pats
        </h1>
        <p className="text-sm text-white/70">
          {teamStats.season}-{String(teamStats.season + 1).slice(-2)} Season Dashboard
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RecordAndStandingCard schedule={schedule} />
          <PlayoffOddsCard projection={projection} />
          <CountdownCard game={nextGame} />
          <GameResultCard game={lastGame} />
        </div>
      </div>

      <div className="grid gap-6 px-4 sm:px-0 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Team Strength vs. League</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Point Differential"
              value={`${teamStats.pointDifferential.value > 0 ? "+" : ""}${teamStats.pointDifferential.value}`}
              leagueRank={teamStats.pointDifferential.leagueRank}
              soWhat={`Pythagorean win% suggests a ${formatPercent(teamStats.pythagoreanWinPct)} true-talent team.`}
              animate={{
                value: teamStats.pointDifferential.value,
                prefix: teamStats.pointDifferential.value > 0 ? "+" : "",
              }}
            />
            <StatCard
              label="Offensive EPA/play"
              value={teamStats.epaPerPlay.offense.value.toFixed(2)}
              leagueRank={teamStats.epaPerPlay.offense.leagueRank}
              soWhat={`${ordinal(teamStats.epaPerPlay.offense.leagueRank)}-ranked offense by the metric that best predicts scoring.`}
              animate={{ value: teamStats.epaPerPlay.offense.value, decimals: 2 }}
            />
            <StatCard
              label="Defensive EPA/play"
              value={teamStats.epaPerPlay.defense.value.toFixed(2)}
              leagueRank={teamStats.epaPerPlay.defense.leagueRank}
              soWhat={`${ordinal(teamStats.epaPerPlay.defense.leagueRank)}-ranked defense — negative is good here.`}
              animate={{ value: teamStats.epaPerPlay.defense.value, decimals: 2 }}
            />
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Division Race</h2>
          <DivisionStandings standings={standings} />
        </div>
      </div>

      <div className="px-4 sm:px-0">
        <h2 className="mb-3 text-lg font-semibold">Latest Headlines</h2>
        <HeadlinesList items={news} />
      </div>
    </div>
  );
}
