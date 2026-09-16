"use client";

import { useEffect, useState } from "react";
import type { Game, OpponentMatchupData } from "@/lib/data/types";
import { formatDate, kickoffIso, weatherEmoji } from "@/lib/util/format";
import { TeamLogo } from "@/components/shared/TeamLogo";

function useCountdown(targetIso: string) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Kickoff!");
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setLabel(
        days > 0
          ? `${days}d ${hours}h until kickoff`
          : `${hours}h ${minutes}m until kickoff`
      );
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetIso]);

  return label;
}

export function NextGameHero({
  game,
  opponent,
  weather,
  bettingContext,
}: {
  game: Game;
  opponent: string;
  weather?: OpponentMatchupData["weather"];
  bettingContext?: OpponentMatchupData["bettingContext"];
}) {
  const countdown = useCountdown(kickoffIso(game.date, game.kickoffTimeEt));
  const isHome = game.homeTeam === "NE";

  const subtext: string[] = [];
  if (weather && !weather.isDome) {
    subtext.push(`Wind ${weather.wind}`, `${weather.precipitation} chance of precip`);
  }
  if (bettingContext) {
    subtext.push(`NE ${bettingContext.spread > 0 ? "+" : ""}${bettingContext.spread}`);
  }

  return (
    <div className="-mx-4 hero-texture bg-gradient-to-br from-navy via-navy to-navy-deep px-4 py-8 text-center sm:mx-0 sm:rounded-xl sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-red-light">
        Week {game.week} · {isHome ? "Home" : "Away"}
      </p>
      <div className="mt-3 flex items-center justify-center gap-4 font-display text-5xl font-bold text-white sm:text-6xl">
        <TeamLogo team="NE" size={56} onDark />
        <span>NE</span>
        <span className="text-2xl text-silver">vs</span>
        <span>{opponent}</span>
        <TeamLogo team={opponent} size={56} onDark />
      </div>
      <p className="mt-3 text-white/70">
        {formatDate(game.date)} · {game.venue}
        {game.network ? ` · ${game.network}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {countdown && (
          <span className="inline-block rounded-full bg-red px-4 py-1.5 text-sm font-semibold text-white">
            {countdown}
          </span>
        )}
        {weather && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white">
            <span className="text-base">{weatherEmoji(weather)}</span>
            {weather.isDome ? "Indoors" : `${weather.tempF}°F`}
          </span>
        )}
      </div>
      {subtext.length > 0 && (
        <p className="mt-2 text-xs text-white/60">{subtext.join(" · ")}</p>
      )}
    </div>
  );
}
