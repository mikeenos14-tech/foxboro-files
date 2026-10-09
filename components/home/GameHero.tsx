"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { gamePhase, type GamePhase } from "@/lib/calc/gamePhase";
import { kickoffIso } from "@/lib/util/format";

// The top of the home page, which changes with the week: the next game
// (with when, where to watch and the one matchup to watch), the day of,
// during, and for a day and a half after a game the result and what stood
// out. The other game sits underneath as one slim line. Everything shown
// is prepared on the server; this only decides which state it is.

export interface HeroGame {
  id: string;
  week: number;
  opponent: string;
  isHome: boolean;
  date: string;
  kickoffTimeEt?: string;
  dateLabel: string;
  kickoffLabel: string | null;
  network?: string;
}

export interface HeroNext extends HeroGame {
  /** "NE −3.5 · O/U 45.5 (betting market, not a prediction)" */
  line?: string;
  /** "Our pass defense (90/100) vs. LV's pass offense (68/100)" */
  matchupToWatch?: string;
}

export interface HeroLast extends HeroGame {
  us: number;
  them: number;
  /** The top "What Stood Out" item, if the game produced one. */
  standout?: string;
  hasRecap: boolean;
}

function useCountdown(targetIso: string) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) return setLabel(null);
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setLabel(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [targetIso]);
  return label;
}

const resultLetter = (us: number, them: number) => (us > them ? "W" : us < them ? "L" : "T");
const vsAt = (g: HeroGame) => (g.isHome ? "vs." : "at");

function Matchup({ opponent, isHome, size }: { opponent: string; isHome: boolean; size: number }) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <TeamLogo team="NE" size={size} onDark />
      <span className="font-display text-4xl font-bold text-white sm:text-5xl">NE</span>
      <span className="text-xl text-silver">{isHome ? "vs" : "@"}</span>
      <span className="font-display text-4xl font-bold text-white sm:text-5xl">{opponent}</span>
      <TeamLogo team={opponent} size={size} onDark />
    </div>
  );
}

function NextCard({ next, phase }: { next: HeroNext; phase: GamePhase }) {
  const countdown = useCountdown(kickoffIso(next.date, next.kickoffTimeEt));
  const when =
    phase === "live"
      ? `In progress${next.network ? ` · watch on ${next.network}` : ""}`
      : phase === "awaiting"
        ? "Final · result and recap after the next update"
        : [phase === "gameday" ? "Today" : next.dateLabel, next.kickoffLabel, next.network].filter(Boolean).join(" · ");
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-light">
        {phase === "gameday" ? "Game day" : "Next game"} · Week {next.week} · {next.isHome ? "Home" : "Away"}
      </p>
      <div className="mt-3">
        <Matchup opponent={next.opponent} isHome={next.isHome} size={48} />
      </div>
      <p className="mt-3 text-base font-medium text-white">{when}</p>
      {next.line && phase !== "awaiting" && <p className="mt-0.5 text-xs text-white/60">{next.line}</p>}
      {countdown && (phase === "upcoming" || phase === "gameday") && (
        <span className="mt-3 inline-block rounded-full bg-red px-4 py-1 text-sm font-semibold text-white">
          {countdown} to kickoff
        </span>
      )}
      {next.matchupToWatch && phase !== "awaiting" && (
        <p className="mx-auto mt-3 max-w-md rounded-md bg-white/10 px-3 py-2 text-sm text-white/90">
          <span className="font-semibold text-white">Matchup to watch: </span>
          {next.matchupToWatch}
        </p>
      )}
      <Link
        href="/next-game"
        className="mt-4 inline-block rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        Full preview →
      </Link>
    </div>
  );
}

function ResultCard({ last }: { last: HeroLast }) {
  const letter = resultLetter(last.us, last.them);
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-light">
        Final · Week {last.week} · {last.isHome ? "Home" : "Away"}
      </p>
      <div className="mt-3">
        <Matchup opponent={last.opponent} isHome={last.isHome} size={44} />
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-white">
        <span className={letter === "W" ? "text-rank-good" : letter === "L" ? "text-red-light" : ""}>{letter}</span>{" "}
        {last.us}–{last.them}
      </p>
      {last.standout && (
        <p className="mx-auto mt-3 max-w-md rounded-md bg-white/10 px-3 py-2 text-sm text-white/90">
          <span className="font-semibold text-white">What stood out: </span>
          {last.standout}
        </p>
      )}
      <Link
        href={`/recap/${last.id}`}
        className="mt-4 inline-block rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        {last.hasRecap ? "Read the recap →" : "Recap by Monday morning →"}
      </Link>
    </div>
  );
}

function SlimRow({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/50">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
      <span aria-hidden className="text-white/40">→</span>
    </Link>
  );
}

export function GameHero({
  next,
  last,
  initialPhase,
}: {
  next: HeroNext | null;
  last: HeroLast | null;
  initialPhase: GamePhase;
}) {
  const [phase, setPhase] = useState(initialPhase);
  useEffect(() => {
    const tick = () =>
      setPhase(
        gamePhase(
          new Date(),
          next && { date: next.date, kickoffTimeEt: next.kickoffTimeEt },
          last && { date: last.date, kickoffTimeEt: last.kickoffTimeEt, hasResult: true }
        )
      );
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [next, last]);

  const showResult = phase === "postgame" && last;
  return (
    <div className="space-y-3">
      {showResult ? <ResultCard last={last} /> : next ? <NextCard next={next} phase={phase} /> : null}

      {showResult && next ? (
        <SlimRow href="/next-game" label="Next">
          {vsAt(next)} {next.opponent} · {[next.dateLabel, next.kickoffLabel, next.network].filter(Boolean).join(" · ")}
        </SlimRow>
      ) : last ? (
        <SlimRow href={`/recap/${last.id}`} label="Last">
          <span className="font-semibold text-white">
            {resultLetter(last.us, last.them)} {last.us}–{last.them}
          </span>{" "}
          {vsAt(last)} {last.opponent}
          {last.standout && <span className="mt-0.5 block truncate text-xs text-white/60">{last.standout}</span>}
        </SlimRow>
      ) : null}
    </div>
  );
}
