import { notFound } from "next/navigation";
import type { Metadata } from "next";
import * as store from "@/lib/data/store";
import { BoxScoreSummary } from "@/components/recap/BoxScoreSummary";
import { GoodBadUglySidebar } from "@/components/recap/GoodBadUglySidebar";
import { PlayerOfTheGameCard } from "@/components/recap/PlayerOfTheGameCard";
import { WinProbabilityChart } from "@/components/shared/WinProbabilityChart";
import { StatCard } from "@/components/shared/StatCard";
import { formatPercent, opponentLabel, signed } from "@/lib/util/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>;
}): Promise<Metadata> {
  const { gameId } = await params;
  const game = await store.getPlayedGame(gameId);
  if (!game) return { title: "Recap" };
  const isHome = game.homeTeam === "NE";
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const usScore = isHome ? game.homeScore : game.awayScore;
  const themScore = isHome ? game.awayScore : game.homeScore;
  return {
    title: `Week ${game.week}: NE ${usScore}-${themScore} ${opponentLabel(opponent, isHome)}`,
  };
}

export default async function RecapDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const recap = await store.getRecapByGameId(gameId);
  const game = await store.getPlayedGame(gameId);

  if (!recap || !game) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <BoxScoreSummary game={game} />

      {recap.fanTake && (
        <div className="rounded-lg border border-red/30 bg-red/5 p-4">
          <span className="text-xs font-bold uppercase tracking-wide text-red">
            The Take
          </span>
          <p className="mt-2 text-sm leading-relaxed">{recap.fanTake}</p>
        </div>
      )}

      <p className="rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed">
        {recap.narrative}
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Win Probability</h2>
          <WinProbabilityChart timeline={recap.winProbabilityTimeline} />

          <h2 className="text-lg font-semibold">Advanced Stats</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Offensive EPA/play"
              value={recap.epaPerPlay.offense.toFixed(2)}
            />
            <StatCard
              label="Defensive EPA/play"
              value={recap.epaPerPlay.defense.toFixed(2)}
            />
            <StatCard
              label="Turnover Margin"
              value={signed(recap.turnoverMargin, 0)}
            />
            <StatCard
              label="Explosive Play Rate (for/against)"
              value={`${formatPercent(recap.explosivePlayRate.for)} / ${formatPercent(recap.explosivePlayRate.against)}`}
            />
            <StatCard
              label="Red Zone (off/def)"
              value={`${recap.redZone.offense.td}/${recap.redZone.offense.att} · ${recap.redZone.defense.td}/${recap.redZone.defense.att}`}
            />
            <StatCard
              label="3rd Down (off/def)"
              value={`${recap.thirdDown.offense.conv}/${recap.thirdDown.offense.att} · ${recap.thirdDown.defense.conv}/${recap.thirdDown.defense.att}`}
            />
          </div>
        </div>

        <div className="space-y-4">
          <PlayerOfTheGameCard playerOfTheGame={recap.playerOfTheGame} />
          <GoodBadUglySidebar goodBadUgly={recap.goodBadUgly} />
        </div>
      </div>
    </div>
  );
}
