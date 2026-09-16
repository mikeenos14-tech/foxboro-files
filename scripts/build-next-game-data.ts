// Builds the Next Game page's opponent matchup data: real EPA-based
// position-unit matchups (rush offense vs run defense, pass offense vs
// pass defense, pass protection vs pass rush, and both mirrored on
// defense), opponent EPA ranks, recent form, all-time head-to-head, and
// the real current betting line from ESPN's scoreboard. Everything here
// is computed from real play-by-play/schedule data — no PFF-style
// player-vs-player grades (we don't have that data), just honest team/
// unit-level EPA splits, which is a defensible substitute.
//
// Run with: npx tsx scripts/build-next-game-data.ts
// (after: npx tsx scripts/build-data.ts, scripts/fetch-news-sources.ts)

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num } from "./lib/csv";
import { playTypeEpa, sackRateAllowed, sackRateGenerated, type PbpRow } from "./lib/pbp";
import { computeLeagueEpaTable, offenseEpaRankOnly, defenseEpaRankOnly } from "./lib/leagueRanks";
import { rankGeneric } from "./lib/rank";
import { ALL_TEAMS } from "./lib/teams";
import { VENUES } from "./lib/venues";
import { ordinal } from "../lib/calc/ranks";
import type {
  Game,
  OpponentMatchupData,
  PositionMatchup,
} from "../lib/data/types";

const TEAM = "NE";
const SEASON = 2026;
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

type GameRow = Record<string, string>;

function edgeFor(ourGrade: number, theirGrade: number): PositionMatchup["edge"] {
  const diff = ourGrade - theirGrade;
  if (diff >= 12) return "us";
  if (diff <= -12) return "them";
  return "even";
}

async function main() {
  await mkdir(GENERATED_DIR, { recursive: true });

  const games = await loadCsv<GameRow>("games.csv");
  const pbp = await loadCsv<PbpRow>("play_by_play_2026.csv");

  let nextGame: Game;
  try {
    nextGame = JSON.parse(
      await readFile(path.join(GENERATED_DIR, "next-game.json"), "utf-8")
    );
  } catch {
    console.warn("next-game.json not found — run build-data.ts first. Skipping.");
    return;
  }
  const opponent = nextGame.homeTeam === TEAM ? nextGame.awayTeam : nextGame.homeTeam;

  // ---------- EPA-based unit matchups ----------
  const grade = (valueOf: (t: string) => number, higherIsBetter: boolean, team: string) =>
    rankGeneric(ALL_TEAMS, team, valueOf, higherIsBetter).leaguePercentile;

  const rushOffGrade = (t: string) => grade((tt) => playTypeEpa(pbp, tt, "posteam", "run"), true, t);
  const passOffGrade = (t: string) => grade((tt) => playTypeEpa(pbp, tt, "posteam", "pass"), true, t);
  const rushDefGrade = (t: string) => grade((tt) => playTypeEpa(pbp, tt, "defteam", "run"), false, t);
  const passDefGrade = (t: string) => grade((tt) => playTypeEpa(pbp, tt, "defteam", "pass"), false, t);
  const passProGrade = (t: string) => grade((tt) => sackRateAllowed(pbp, tt), false, t);
  const passRushGrade = (t: string) => grade((tt) => sackRateGenerated(pbp, tt), true, t);

  function unitNote(
    label: string,
    ourGrade: number,
    theirGrade: number,
    edge: PositionMatchup["edge"]
  ): string {
    const verdict =
      edge === "us"
        ? "advantage us"
        : edge === "them"
          ? "advantage them"
          : "close matchup";
    return `${ordinal(ourGrade)} percentile vs. ${ordinal(theirGrade)} percentile (${verdict}).`;
  }

  const categories: Array<{ label: string; ours: number; theirs: number }> = [
    { label: "Rush Offense vs. Run Defense", ours: rushOffGrade(TEAM), theirs: rushDefGrade(opponent) },
    { label: "Pass Offense vs. Pass Defense", ours: passOffGrade(TEAM), theirs: passDefGrade(opponent) },
    { label: "Run Defense vs. Rush Offense", ours: rushDefGrade(TEAM), theirs: rushOffGrade(opponent) },
    { label: "Pass Defense vs. Pass Offense", ours: passDefGrade(TEAM), theirs: passOffGrade(opponent) },
    { label: "Pass Protection vs. Pass Rush", ours: passProGrade(TEAM), theirs: passRushGrade(opponent) },
  ];

  const positionGroupMatchups: PositionMatchup[] = categories.map((c) => {
    const edge = edgeFor(c.ours, c.theirs);
    return {
      group: c.label,
      ourGrade: c.ours,
      theirGrade: c.theirs,
      edge,
      note: unitNote(c.label, c.ours, c.theirs, edge),
    };
  });

  const biggest = [...categories]
    .map((c) => ({ ...c, gap: c.ours - c.theirs }))
    .sort((a, b) => b.gap - a.gap)[0];
  const matchupOfTheWeek = {
    title: biggest.label,
    description:
      biggest.gap > 0
        ? `Our ${biggest.label.split(" vs. ")[0].toLowerCase()} grades in the ${ordinal(biggest.ours)} percentile against a unit that grades ${ordinal(biggest.theirs)} — the widest real statistical edge on the board this week.`
        : `Their unit actually grades better here (${ordinal(biggest.theirs)} percentile vs. our ${ordinal(biggest.ours)}) — the closest thing to a swing spot working against us this week.`,
  };

  // ---------- Opponent EPA rank ----------
  // Opponent-adjusted (see leagueRanks.ts) — a defense doesn't rank highly
  // just from facing bad offenses, and vice versa.
  const leagueEpaTable = computeLeagueEpaTable(pbp, ALL_TEAMS);
  const opponentEpaRank = {
    offense: offenseEpaRankOnly(leagueEpaTable, opponent),
    defense: defenseEpaRankOnly(leagueEpaTable, opponent),
  };

  // ---------- Recent form (net EPA/play: offense generated minus defense allowed) ----------
  const opponentGames = games
    .filter(
      (g) =>
        num(g.season) === SEASON &&
        g.game_type === "REG" &&
        (g.home_team === opponent || g.away_team === opponent) &&
        g.home_score !== ""
    )
    .sort((a, b) => num(b.week) - num(a.week));

  function netEpaOverGames(gameIds: string[]): number {
    const rows = pbp.filter((r) => gameIds.includes(r.game_id) && (r.play_type === "run" || r.play_type === "pass"));
    const off = rows.filter((r) => r.posteam === opponent);
    const def = rows.filter((r) => r.defteam === opponent);
    const offEpa = off.length === 0 ? 0 : off.reduce((s, r) => s + num(r.epa), 0) / off.length;
    const defEpa = def.length === 0 ? 0 : def.reduce((s, r) => s + num(r.epa), 0) / def.length;
    return offEpa - defEpa;
  }

  const recentForm = {
    last3EpaPerPlay: netEpaOverGames(opponentGames.slice(0, 3).map((g) => g.game_id)),
    last5EpaPerPlay: netEpaOverGames(opponentGames.slice(0, 5).map((g) => g.game_id)),
    seasonEpaPerPlay: netEpaOverGames(opponentGames.map((g) => g.game_id)),
  };

  // ---------- All-time head-to-head ----------
  const meetings = games
    .filter(
      (g) =>
        g.game_type === "REG" &&
        g.home_score !== "" &&
        ((g.home_team === TEAM && g.away_team === opponent) ||
          (g.home_team === opponent && g.away_team === TEAM))
    )
    .sort((a, b) => num(b.season) - num(a.season) || num(b.week) - num(a.week))
    .slice(0, 5);

  const headToHead = meetings.map((g) => {
    const isHome = g.home_team === TEAM;
    const usScore = num(isHome ? g.home_score : g.away_score);
    const themScore = num(isHome ? g.away_score : g.home_score);
    const result = usScore > themScore ? "W" : usScore < themScore ? "L" : "T";
    return { season: num(g.season), result, score: `${usScore}-${themScore}` };
  });

  // ---------- Betting context (real, from ESPN's scoreboard) ----------
  let bettingContext: OpponentMatchupData["bettingContext"];
  try {
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "raw", "espn-scoreboard.json"), "utf-8")
    );
    const event = raw.events?.find((e: { competitions: Array<{ competitors: Array<{ team: { abbreviation: string } }> }> }) =>
      e.competitions?.[0]?.competitors?.some((c) => c.team?.abbreviation === TEAM)
    );
    const odds = event?.competitions?.[0]?.odds?.[0];
    if (odds?.spread !== undefined && odds?.overUnder !== undefined) {
      const isHome = nextGame.homeTeam === TEAM;
      // ESPN's `spread` is relative to the home team; flip sign if we're away.
      const ourSpread = isHome ? odds.spread : -odds.spread;
      bettingContext = {
        spread: ourSpread,
        overUnder: odds.overUnder,
        asOf: new Date().toISOString().slice(0, 10),
      };
    }
  } catch {
    // No odds available (bye week, market not posted yet, endpoint changed) —
    // omit the field rather than show stale/fake numbers.
  }

  // ---------- Weather (real forecast, from Open-Meteo — free, no key) ----------
  // Domes/retractable roofs are treated as indoor (see venues.ts for why).
  // Open-Meteo's forecast range tops out at 16 days out; if the game is
  // further away than that (rare — only right after a bye), the fetch just
  // fails and weather is omitted rather than showing a guess.
  let weather: OpponentMatchupData["weather"];
  const venue = VENUES[nextGame.homeTeam];
  if (venue?.isDome) {
    weather = { tempF: 72, wind: "0 mph (climate controlled)", precipitation: "0% (indoor)", isDome: true };
  } else if (venue) {
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(venue.lat));
      url.searchParams.set("longitude", String(venue.lon));
      url.searchParams.set("hourly", "temperature_2m,precipitation_probability,wind_speed_10m");
      url.searchParams.set("temperature_unit", "fahrenheit");
      url.searchParams.set("wind_speed_unit", "mph");
      url.searchParams.set("timezone", "America/New_York");
      url.searchParams.set("start_date", nextGame.date);
      url.searchParams.set("end_date", nextGame.date);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const kickoffHour = (nextGame.kickoffTimeEt ?? "13:00").slice(0, 2);
        const targetTime = `${nextGame.date}T${kickoffHour}:00`;
        const idx = data.hourly?.time?.indexOf(targetTime);
        if (idx >= 0) {
          weather = {
            tempF: Math.round(data.hourly.temperature_2m[idx]),
            wind: `${Math.round(data.hourly.wind_speed_10m[idx])} mph`,
            precipitation: `${Math.round(data.hourly.precipitation_probability[idx])}%`,
            isDome: false,
          };
        }
      }
    } catch {
      // Forecast unavailable (too far out, endpoint hiccup) — omit rather
      // than show a stale or fabricated number.
    }
  }

  const matchup: OpponentMatchupData = {
    gameId: nextGame.id,
    opponent,
    opponentEpaRank,
    positionGroupMatchups,
    matchupOfTheWeek,
    opponentInjuries: [], // filled in by build-espn-data.ts and merged in store.ts
    recentForm,
    headToHead,
    weather,
    bettingContext,
  };

  await writeFile(
    path.join(GENERATED_DIR, "opponent-matchup.json"),
    JSON.stringify(matchup, null, 2)
  );
  console.log(`Wrote opponent-matchup.json (vs. ${opponent})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
