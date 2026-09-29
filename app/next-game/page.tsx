import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { TaleOfTheTape } from "@/components/next-game/TaleOfTheTape";
import { MatchupGrid } from "@/components/shared/MatchupGrid";
import { PriorBlendNote } from "@/components/next-game/PriorBlendNote";
import { InjuryTable } from "@/components/shared/InjuryTable";
import { FlagLink } from "@/components/shared/FlagLink";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { Tabs } from "@/components/shared/Tabs";
import { MatchupOfTheWeekCallout } from "@/components/next-game/MatchupOfTheWeekCallout";
import { RecentFormTrend } from "@/components/next-game/RecentFormTrend";
import { NextGameHero } from "@/components/next-game/NextGameHero";
import { opponentLabel } from "@/lib/util/format";

export async function generateMetadata(): Promise<Metadata> {
  const [game, matchup] = await Promise.all([
    store.getNextGame(),
    store.getOpponentMatchup(),
  ]);
  return { title: `Week ${game.week} ${opponentLabel(matchup.opponent, game.homeTeam === "NE")}` };
}

export default async function NextGamePage() {
  const [game, matchup, injuries] = await Promise.all([
    store.getNextGame(),
    store.getOpponentMatchup(),
    store.getInjuries(),
  ]);

  return (
    <div className="space-y-6">
      <NextGameHero
        game={game}
        opponent={matchup.opponent}
        weather={matchup.weather}
        bettingContext={matchup.bettingContext}
      />

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
                    <FlagLink page="/next-game" section="The Preview" text={matchup.previewTake} className="mt-2" />
                  </div>
                )}

                {matchup.ourEpaRank && matchup.successRate && <TaleOfTheTape matchup={matchup} />}

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
                  <p className="mt-1 text-xs text-muted">
                    Whole-unit grades — &ldquo;Rush Offense&rdquo; is every run play including QB
                    scrambles, where the Roster page&apos;s &ldquo;RB&rdquo; is carries by running
                    backs.
                  </p>
                  <PriorBlendNote weight={matchup.priorBlendWeight} subject="These grades" className="mb-3 mt-1" />
                  <MatchupGrid matchups={matchup.positionGroupMatchups} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <RecentFormTrend recentForm={matchup.recentForm} opponent={matchup.opponent} />

                  <div className="lift rounded-lg border border-border bg-surface p-4">
                    <h3 className="font-semibold">Head-to-Head</h3>
                    {matchup.headToHead.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted">
                        New England is{" "}
                        {matchup.headToHead.filter((h) => h.result === "W").length}-
                        {matchup.headToHead.filter((h) => h.result === "L").length} in the last{" "}
                        {matchup.headToHead.length} meetings
                      </p>
                    )}
                    <ul className="mt-2 space-y-1 text-sm text-muted">
                      {matchup.headToHead.map((h, i) => (
                        <li key={i}>
                          {h.season}: {h.result} {h.score}
                        </li>
                      ))}
                    </ul>
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

      {/* A for-fun guess box that saves nothing — below the real content,
          not above it, where on a phone it pushed the preview off-screen. */}
    </div>
  );
}
