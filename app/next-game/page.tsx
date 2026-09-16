import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { StatCard } from "@/components/shared/StatCard";
import { MatchupGrid } from "@/components/shared/MatchupGrid";
import { InjuryTable } from "@/components/shared/InjuryTable";
import { MatchupOfTheWeekCallout } from "@/components/next-game/MatchupOfTheWeekCallout";
import { RecentFormTrend } from "@/components/next-game/RecentFormTrend";
import { NextGameHero } from "@/components/next-game/NextGameHero";
import { ScorePredictor } from "@/components/next-game/ScorePredictor";
import { formatDate } from "@/lib/util/format";
import { ordinal } from "@/lib/calc/ranks";

export async function generateMetadata(): Promise<Metadata> {
  const [game, matchup] = await Promise.all([
    store.getNextGame(),
    store.getOpponentMatchup(),
  ]);
  return { title: `Week ${game.week} vs. ${matchup.opponent}` };
}

export default async function NextGamePage() {
  const [game, matchup, schedule] = await Promise.all([
    store.getNextGame(),
    store.getOpponentMatchup(),
    store.getSchedule(),
  ]);
  const neWinProb = schedule.find((r) => r.gameId === game.id)?.winProbabilityEstimate;

  return (
    <div className="space-y-6">
      <NextGameHero game={game} opponent={matchup.opponent} />

      <ScorePredictor opponent={matchup.opponent} neWinProb={neWinProb} />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Opponent Offensive EPA Rank"
          value={ordinal(matchup.opponentEpaRank.offense)}
          leagueRank={matchup.opponentEpaRank.offense}
        />
        <StatCard
          label="Opponent Defensive EPA Rank"
          value={ordinal(matchup.opponentEpaRank.defense)}
          leagueRank={matchup.opponentEpaRank.defense}
        />
      </div>

      <MatchupOfTheWeekCallout
        title={matchup.matchupOfTheWeek.title}
        description={matchup.matchupOfTheWeek.description}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Position Group Matchups</h2>
        <MatchupGrid matchups={matchup.positionGroupMatchups} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentFormTrend recentForm={matchup.recentForm} />

        <div className="lift rounded-lg border border-border bg-surface p-4">
          <h3 className="font-semibold">Head-to-Head</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {matchup.headToHead.map((h, i) => (
              <li key={i}>
                {h.season}: {h.result} {h.score}
              </li>
            ))}
          </ul>
          {matchup.weather && (
            <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
              {matchup.weather.isDome
                ? "Game-day forecast: indoors, climate controlled — weather is not a factor."
                : `Game-day forecast: ${matchup.weather.tempF}°F, wind ${matchup.weather.wind}, ${matchup.weather.precipitation} chance of precip.`}
            </p>
          )}
          {matchup.bettingContext && (
            <p className="mt-1 text-xs text-muted">
              Market (as of {formatDate(matchup.bettingContext.asOf)}):{" "}
              {matchup.bettingContext.spread > 0 ? "+" : ""}
              {matchup.bettingContext.spread} spread, {matchup.bettingContext.overUnder}{" "}
              O/U — public perception only, not a prediction.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Opponent Injury Report</h2>
        <InjuryTable entries={matchup.opponentInjuries} />
      </div>
    </div>
  );
}
