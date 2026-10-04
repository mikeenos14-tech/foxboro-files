"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game } from "@/lib/data/types";
import { formatDate, formatKickoff, kickoffIso, opponentLabel } from "@/lib/util/format";
import { TeamLogo } from "@/components/shared/TeamLogo";

// The question most people open the site to answer from Thursday to
// Sunday — when's the game and how do I watch it — used to be a 160px
// card with no time. This is one full-width line: week, opponent, day,
// kickoff, network, countdown, line. The site isn't live-scoring, so on
// game day it says so rather than pretending.
// "Today" means the calendar day in Eastern time, not "under 24 hours
// away" — at 11pm Saturday a 1pm Sunday game isn't today yet.
const etDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

function useGameDayState(targetIso: string, gameDate: string) {
  const [state, setState] = useState<"before" | "today" | "live" | "after">("before");
  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    function tick() {
      const kickoff = new Date(targetIso).getTime();
      const diff = kickoff - Date.now();
      if (diff <= 0) {
        // A game runs about 3.5 hours.
        setState(diff > -3.5 * 3600000 ? "live" : "after");
        setCountdown(null);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      setState(etDate(new Date()) === gameDate ? "today" : "before");
      setCountdown(days > 0 ? `${days}d ${hours}h` : `${hours}h ${Math.floor((diff % 3600000) / 60000)}m`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetIso, gameDate]);
  return { state, countdown };
}

export function NextUpStrip({ game, spread }: { game: Game; spread?: number }) {
  const isHome = game.homeTeam === "NE";
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const { state, countdown } = useGameDayState(kickoffIso(game.date, game.kickoffTimeEt), game.date);
  const kickoff = formatKickoff(game.kickoffTimeEt);

  const when =
    state === "live"
      ? "In progress"
      : state === "after"
        ? "Final · recap by Monday morning"
        : [state === "today" ? "Today" : formatDate(game.date), kickoff].filter(Boolean).join(" · ");
  const details = [game.network, spread !== undefined ? `NE ${spread > 0 ? "+" : ""}${spread}` : null].filter(Boolean);

  return (
    <Link
      href="/next-game"
      className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 backdrop-blur-sm transition hover:bg-white/15"
    >
      <TeamLogo team={opponent} size={36} onDark />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
            Next · Week {game.week}
          </span>
          <span className="font-display text-xl font-bold text-white">{opponentLabel(opponent, isHome)}</span>
        </div>
        <p className="text-sm leading-snug text-white/80">
          {when}
          {details.length > 0 && <span className="text-white/60"> · {details.join(" · ")}</span>}
        </p>
      </div>
      {countdown && (
        <span className="shrink-0 rounded-full bg-red px-3 py-1 text-xs font-semibold text-white">{countdown}</span>
      )}
      <span aria-hidden className="hidden text-white/50 sm:inline">→</span>
    </Link>
  );
}
