import { PriorBlendNote } from "@/components/next-game/PriorBlendNote";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { PercentBar } from "@/components/shared/PercentBar";
import { HeroAnswerCard } from "@/components/shared/HeroAnswerCard";
import { NextUpStrip } from "@/components/home/NextUpStrip";
import { LastGameStrip } from "@/components/home/LastGameStrip";
import { CountUp } from "@/components/shared/CountUp";
import { HeadlinesList } from "@/components/home/HeadlinesList";
import { DivisionStandings } from "@/components/home/DivisionStandings";
import { TeamSnapshot } from "@/components/home/TeamSnapshot";
import { WeeklyTrend } from "@/components/home/WeeklyTrend";
import * as store from "@/lib/data/store";
import { ordinal } from "@/lib/calc/ranks";
import { buildVerdict } from "@/lib/calc/verdict";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ teamWindow?: string }>;
}) {
  const { teamWindow } = await searchParams;
  const [teamStats, schedule, projection, nextGame, lastGame, news, standings, priorSeason, reportCards, matchup, recaps] =
    await Promise.all([
      store.getTeamStats(),
      store.getSchedule(),
      store.getSeasonProjection(),
      store.getNextGame(),
      store.getLastGame(),
      store.getNews(),
      store.getDivisionStandings(),
      store.getPriorSeason(),
      store.getPositionGroupReportCards(),
      store.getOpponentMatchup(),
      store.getAllRecaps(),
    ]);

  const played = schedule.filter((g) => g.result);
  const wins = played.filter((g) => g.result === "W").length;
  const losses = played.filter((g) => g.result === "L").length;
  const ties = played.filter((g) => g.result === "T").length;
  const divisionRank = standings.findIndex((s) => s.isUs) + 1;

  // The verdict this page exists to deliver. The hero used to restate the
  // record that's already displayed 100px above it, leaving the reader to
  // assemble "are we actually good?" out of seven equally-weighted stat
  // cards pointing different directions.
  const verdict = buildVerdict(teamStats, wins, losses, ties);

  return (
    <div className="-mx-4 space-y-8 sm:mx-0">
      <div className="-mt-6 hero-texture bg-gradient-to-br from-navy via-navy to-navy-deep px-4 py-6 sm:mt-0 sm:rounded-xl sm:px-6">
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
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <NextUpStrip game={nextGame} spread={matchup.bettingContext?.spread} />
          <LastGameStrip game={lastGame} />
        </div>
        {projection.playoffOdds !== undefined && (
          <PriorBlendNote
            weight={matchup.priorBlendWeight}
            subject="Playoff odds"
            onDark
            className="mt-4 max-w-2xl"
          />
        )}
      </div>

      <div className="px-4 sm:px-0">
        <HeroAnswerCard headline={verdict.headline} tone={verdict.tone}>
          <p className="text-sm text-muted">{verdict.detail}</p>
        </HeroAnswerCard>
      </div>

      <div className="grid gap-6 px-4 sm:px-0 lg:grid-cols-3">
        {/* min-w-0 is load-bearing: a grid item defaults to min-width:auto,
            so the horizontally-scrolling unit-grades strip inside expanded
            this whole column to its content width (727px on a 375px phone)
            instead of scrolling, which pushed every table beside it off the
            screen. */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <TeamSnapshot
            teamStats={teamStats}
            cards={reportCards}
            priorSeason={priorSeason}
            initialWindow={teamWindow}
          />
          <WeeklyTrend recaps={recaps} />
        </div>
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
