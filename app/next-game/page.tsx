import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { StatCard } from "@/components/shared/StatCard";
import { MatchupGrid } from "@/components/shared/MatchupGrid";
import { InjuryTable } from "@/components/shared/InjuryTable";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { Tabs } from "@/components/shared/Tabs";
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
  const [game, matchup, schedule, injuries] = await Promise.all([
    store.getNextGame(),
    store.getOpponentMatchup(),
    store.getSchedule(),
    store.getInjuries(),
  ]);
  const neWinProb = schedule.find((r) => r.gameId === game.id)?.winProbabilityEstimate;

  return (
    <div className="space-y-6">
      <NextGameHero
        game={game}
        opponent={matchup.opponent}
        weather={matchup.weather}
        bettingContext={matchup.bettingContext}
      />

      <ScorePredictor opponent={matchup.opponent} neWinProb={neWinProb} />

      <Tabs
        tabs={[
          {
            label: "Preview",
            content: (
              <div className="space-y-6">
                {matchup.previewTake && (
                  <div className="rounded-lg border border-red/30 bg-red/5 p-4">
                    <span className="text-xs font-bold uppercase tracking-wide text-red">
                      The Preview
                    </span>
                    <p className="mt-2 text-sm leading-relaxed">{matchup.previewTake}</p>
                  </div>
                )}

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
              </div>
            ),
          },
          {
            label: "Matchups",
            content: (
              <div className="space-y-6">
                {/* These grades are deliberately not the same numbers as
                    the Roster page's, and readers notice, so the page
                    says why rather than letting it look like a
                    contradiction. Two real differences:

                    1. These are forward-looking, so they blend last
                       season while the sample is thin (weight hits zero
                       at 4 games — see scripts/lib/priorBlend.ts). The
                       Roster page is a record of this season only.
                    2. These are whole-unit: "Rush Offense" is every run
                       play including QB scrambles, where the Roster
                       page's "RB" is carries by running backs. Through
                       Week 2 that single distinction is worth ~45
                       percentile points, because Maye's scrambles are
                       the most efficient runs on the team. */}
                <div>
                  <h2 className="text-lg font-semibold">Position Group Matchups</h2>
                  <p className="mb-3 mt-1 text-xs text-muted">
                    Forward-looking whole-unit grades: they include last season while this
                    one is young, and count every play by the unit (rushing includes QB
                    scrambles). The Roster page grades this season only, by position.
                  </p>
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
                    {matchup.bettingContext && (
                      <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
                        Market (as of {formatDate(matchup.bettingContext.asOf)}):{" "}
                        {matchup.bettingContext.spread > 0 ? "+" : ""}
                        {matchup.bettingContext.spread} spread, {matchup.bettingContext.overUnder}{" "}
                        O/U — public perception only, not a prediction.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ),
          },
          {
            label: "Injuries",
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <TeamLogo team="NE" size={20} />
                    <h3 className="text-sm font-semibold text-muted">Patriots</h3>
                  </div>
                  <InjuryTable entries={injuries} />
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <TeamLogo team={matchup.opponent} size={20} />
                    <h3 className="text-sm font-semibold text-muted">{matchup.opponent}</h3>
                  </div>
                  <InjuryTable entries={matchup.opponentInjuries} />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
