import { TeamLogo } from "@/components/shared/TeamLogo";
import { PercentBar } from "@/components/shared/PercentBar";
import { HeroAnswerCard } from "@/components/shared/HeroAnswerCard";
import { MiniGameCard } from "@/components/home/MiniGameCard";
import { CountUp } from "@/components/shared/CountUp";
import { HeadlinesList } from "@/components/home/HeadlinesList";
import { DivisionStandings } from "@/components/home/DivisionStandings";
import { TeamStrengthSection } from "@/components/home/TeamStrengthSection";
import * as store from "@/lib/data/store";
import { ordinal } from "@/lib/calc/ranks";

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

  const played = schedule.filter((g) => g.result);
  const wins = played.filter((g) => g.result === "W").length;
  const losses = played.filter((g) => g.result === "L").length;
  const ties = played.filter((g) => g.result === "T").length;
  const divisionRank = standings.findIndex((s) => s.isUs) + 1;
  const us = standings.find((s) => s.isUs);

  // A real, single-sentence season snapshot using numbers already computed
  // elsewhere on this page — the StatMuse "hero answer" pattern (a bold
  // colored headline sentence, not a bare number in a box).
  const streakText = us?.streak
    ? `on a ${us.streak.count}-game ${us.streak.result === "W" ? "winning" : us.streak.result === "L" ? "losing" : ""} streak`
    : "yet to establish a streak";
  const diffText =
    teamStats.pointDifferential.value === 0
      ? "an even"
      : teamStats.pointDifferential.value > 0
        ? `a +${teamStats.pointDifferential.value}`
        : `a ${teamStats.pointDifferential.value}`;

  return (
    <div className="-mx-4 space-y-8 sm:mx-0">
      <div className="hero-texture bg-gradient-to-br from-navy via-navy to-navy-deep px-4 py-6 sm:rounded-xl sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <TeamLogo team="NE" size={44} onDark />
              <div>
                <h1 className="font-display text-2xl font-bold uppercase leading-tight tracking-wide text-white sm:text-3xl">
                  Patriots
                </h1>
                <p className="text-xs text-white/60">
                  {teamStats.season}-{String(teamStats.season + 1).slice(-2)} Season
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-display text-3xl font-bold text-white">
                <CountUp value={wins} duration={700} />-
                <CountUp value={losses} duration={700} />
                {ties > 0 && (
                  <>
                    -<CountUp value={ties} duration={700} />
                  </>
                )}
              </span>
              <span className="text-sm text-white/70">
                {divisionRank > 0 ? `${ordinal(divisionRank)} in AFC East` : "AFC East"}
              </span>
              {projection.playoffOdds !== undefined && (
                <div className="w-28">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-white/60">
                      Playoff odds
                    </span>
                    <span className="text-sm font-bold text-white">
                      <CountUp value={projection.playoffOdds * 100} decimals={0} suffix="%" duration={900} />
                    </span>
                  </div>
                  <PercentBar value={projection.playoffOdds * 100} className="mt-1 bg-white/15" />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <MiniGameCard label="Last" game={lastGame} linkToRecap />
            <MiniGameCard label="Next" game={nextGame} />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-0">
        <HeroAnswerCard
          headline={
            <>
              The <span className="underline decoration-white/40">Patriots</span> are {wins}-{losses}
              {ties > 0 ? `-${ties}` : ""}, {streakText}, with {diffText} point differential this
              season.
            </>
          }
        />
      </div>

      <div className="grid gap-6 px-4 sm:px-0 lg:grid-cols-3">
        <TeamStrengthSection teamStats={teamStats} />
        <div>
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
