import Link from "next/link";
import * as store from "@/lib/data/store";
import { formatDate } from "@/lib/util/format";

export default async function RecapIndexPage() {
  const recaps = await store.getAllRecaps();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-navy dark:text-white">Game Recaps</h1>
        <p className="text-sm text-muted">Every game this season, broken down.</p>
      </div>

      <div className="space-y-3">
        {recaps.map(({ game, recap }) => {
          const isHome = game.homeTeam === "NE";
          const opponent = isHome ? game.awayTeam : game.homeTeam;
          const usScore = isHome ? game.homeScore : game.awayScore;
          const themScore = isHome ? game.awayScore : game.homeScore;
          const won = (usScore ?? 0) > (themScore ?? 0);

          return (
            <Link
              key={game.id}
              href={`/recap/${game.id}`}
              className="lift block rounded-lg border border-border bg-surface p-4 hover:border-navy/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xl font-bold ${won ? "text-rank-good" : "text-rank-bad"}`}
                  >
                    {won ? "W" : "L"}
                  </span>
                  <span className="text-xl font-bold text-navy dark:text-white">
                    {usScore}-{themScore}
                  </span>
                  <span className="text-muted">vs. {opponent}</span>
                </div>
                <span className="text-sm text-muted">
                  Week {game.week} · {formatDate(game.date)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted">
                {recap.narrative}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
