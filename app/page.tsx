import { PriorBlendNote } from "@/components/next-game/PriorBlendNote";
import { PercentBar } from "@/components/shared/PercentBar";
import { HeroAnswerCard } from "@/components/shared/HeroAnswerCard";
import type { Game } from "@/lib/data/types";
import { GameHero, type HeroLast, type HeroNext } from "@/components/home/GameHero";
import { PlayerSpotlight } from "@/components/home/PlayerSpotlight";
import { gamePhase } from "@/lib/calc/gamePhase";
import { formatDate, formatKickoff } from "@/lib/util/format";
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

  // ---- The top card (GameHero): next game, last game, which to lead with.
  const heroGame = (g: Game) => {
    const isHome = g.homeTeam === "NE";
    return {
      id: g.id,
      week: g.week,
      opponent: isHome ? g.awayTeam : g.homeTeam,
      isHome,
      date: g.date,
      kickoffTimeEt: g.kickoffTimeEt,
      dateLabel: formatDate(g.date),
      kickoffLabel: formatKickoff(g.kickoffTimeEt),
      network: g.network,
    };
  };
  // The "next game" file still points at a game once it's been played,
  // until the refresh catches up — that's the "awaiting" phase.
  const nextIsUpcoming = nextGame.id !== lastGame.id;
  const betting = matchup.gameId === nextGame.id ? matchup.bettingContext : undefined;
  const watch = (() => {
    if (matchup.gameId !== nextGame.id) return undefined;
    const m = matchup.positionGroupMatchups.find((p) => p.group === matchup.matchupOfTheWeek.title);
    if (!m || m.edge === "even") return undefined;
    const [ours, theirs] = m.group.split(" vs. ").map((u) => u.toLowerCase());
    return `our ${ours} (${m.ourGrade}/100) vs. ${matchup.opponent}'s ${theirs} (${m.theirGrade}/100)`;
  })();
  const next: HeroNext | null = nextIsUpcoming
    ? {
        ...heroGame(nextGame),
        line: betting
          ? `NE ${betting.spread > 0 ? "+" : ""}${betting.spread} · O/U ${betting.overUnder} (betting market, not a prediction)`
          : undefined,
        matchupToWatch: watch ? watch.charAt(0).toUpperCase() + watch.slice(1) : undefined,
      }
    : null;
  const lastRecap = recaps.find((r) => r.game.id === lastGame.id)?.recap;
  const lastIsHome = lastGame.homeTeam === "NE";
  const lastUs = lastIsHome ? lastGame.homeScore : lastGame.awayScore;
  const lastThem = lastIsHome ? lastGame.awayScore : lastGame.homeScore;
  const last: HeroLast | null =
    lastUs !== undefined && lastThem !== undefined
      ? {
          ...heroGame(lastGame),
          us: lastUs,
          them: lastThem,
          standout: lastRecap?.standouts?.[0]?.text,
          hasRecap: Boolean(lastRecap),
        }
      : null;
  const initialPhase = gamePhase(
    new Date(),
    next && { date: next.date, kickoffTimeEt: next.kickoffTimeEt },
    last && { date: last.date, kickoffTimeEt: last.kickoffTimeEt, hasResult: true }
  );
  const spotlight =
    lastRecap && lastRecap.playerOfTheGame.playerId && lastRecap.playerOfTheGame.wpa > 0 && last
      ? { potg: lastRecap.playerOfTheGame, gameLabel: `Week ${last.week} ${last.isHome ? "vs." : "at"} ${last.opponent}` }
      : null;

  return (
    <div className="-mx-4 space-y-8 sm:mx-0">
      <div className="-mt-6 hero-texture bg-gradient-to-br from-navy via-navy to-navy-deep px-4 py-6 sm:mt-0 sm:rounded-xl sm:px-6">
        <h1 className="sr-only">The Foxboro Beacon: New England Patriots</h1>
        <GameHero next={next} last={last} initialPhase={initialPhase} />

        {/* The season in one line, under the game. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4">
          <span className="font-display text-2xl font-bold text-white">
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
            <div className="ml-auto w-32">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wide text-white/60">Playoff odds</span>
                <span className="font-display text-lg font-bold text-white">
                  <CountUp value={projection.playoffOdds * 100} decimals={0} suffix="%" duration={900} />
                </span>
              </div>
              <PercentBar value={projection.playoffOdds * 100} className="mt-1 bg-white/15" />
            </div>
          )}
        </div>
        {projection.playoffOdds !== undefined && (
          <PriorBlendNote
            weight={matchup.priorBlendWeight}
            subject="Playoff odds"
            onDark
            className="mt-3 max-w-2xl"
          />
        )}
      </div>

      {spotlight && last && (
        <div className="px-4 sm:px-0">
          <PlayerSpotlight potg={spotlight.potg} gameId={last.id} gameLabel={spotlight.gameLabel} />
        </div>
      )}

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
        <HeadlinesList items={news} limit={3} />
      </div>
    </div>
  );
}
