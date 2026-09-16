// Builds the Around the League page's data: all 8 divisions' standings,
// a league-wide EPA power ranking, and last week's scores across the
// whole league. Everything here is computed from the same real data
// (games.csv, play_by_play_2026.csv) the rest of the site already uses —
// no new fetching.
//
// Run with: npx tsx scripts/build-league-data.ts
// (after: npx tsx scripts/fetch-nflverse.ts)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num } from "./lib/csv";
import { computeStandings } from "./lib/standings";
import { computeDivisionStandings } from "./lib/divisionStandings";
import { computeLeagueEpaTable, offenseEpaRank, defenseEpaRank } from "./lib/leagueRanks";
import { ALL_TEAMS, TEAM_DIVISION } from "./lib/teams";
import type { PbpRow } from "./lib/pbp";
import type { LeagueDivisionGroup, LeagueEpaRanking, LeagueScoreboardGame } from "../lib/data/types";

const SEASON = 2026;
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const DIVISIONS = [
  "AFC East", "AFC North", "AFC South", "AFC West",
  "NFC East", "NFC North", "NFC South", "NFC West",
];

type GameRow = Record<string, string>;

async function main() {
  await mkdir(GENERATED_DIR, { recursive: true });

  const games = await loadCsv<GameRow>("games.csv");
  const pbp = await loadCsv<PbpRow>("play_by_play_2026.csv");
  const standings = computeStandings(games, SEASON);

  // ---------- All 8 division standings ----------
  const leagueStandings: LeagueDivisionGroup[] = DIVISIONS.map((division) => {
    const divisionTeams = ALL_TEAMS.filter((t) => TEAM_DIVISION[t] === division);
    return { division, standings: computeDivisionStandings(games, SEASON, divisionTeams, standings) };
  });
  await writeFile(
    path.join(GENERATED_DIR, "league-standings.json"),
    JSON.stringify(leagueStandings, null, 2)
  );

  // ---------- League EPA power ranking ----------
  // Same opponent-adjusted, prior-blended table that powers every other
  // EPA rank on the site (see leagueRanks.ts) — just exposed for all 32
  // teams instead of one.
  const epaTable = computeLeagueEpaTable(pbp, ALL_TEAMS);
  const leagueEpaRankings: LeagueEpaRanking[] = ALL_TEAMS.map((team) => {
    const off = offenseEpaRank(epaTable, team);
    const def = defenseEpaRank(epaTable, team);
    return {
      team,
      offenseEpa: off.value,
      offenseRank: off.leagueRank,
      defenseEpa: def.value,
      defenseRank: def.leagueRank,
    };
  }).sort((a, b) => a.offenseRank - b.offenseRank);
  await writeFile(
    path.join(GENERATED_DIR, "league-epa-rankings.json"),
    JSON.stringify(leagueEpaRankings, null, 2)
  );

  // ---------- Last week's scores, league-wide ----------
  const playedGames = games.filter(
    (g) => num(g.season) === SEASON && g.game_type === "REG" && g.home_score !== "" && g.home_score !== undefined
  );
  const lastCompletedWeek = playedGames.reduce((max, g) => Math.max(max, num(g.week)), 0);
  const leagueScoreboard: LeagueScoreboardGame[] = playedGames
    .filter((g) => num(g.week) === lastCompletedWeek)
    .map((g) => ({
      gameId: g.game_id,
      week: num(g.week),
      date: g.gameday,
      weekday: g.weekday,
      homeTeam: g.home_team,
      awayTeam: g.away_team,
      homeScore: num(g.home_score),
      awayScore: num(g.away_score),
      overtime: g.overtime === "1",
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.homeTeam.localeCompare(b.homeTeam));
  await writeFile(
    path.join(GENERATED_DIR, "league-scoreboard.json"),
    JSON.stringify(leagueScoreboard, null, 2)
  );

  console.log(
    `Wrote league-standings.json (${DIVISIONS.length} divisions), league-epa-rankings.json (${leagueEpaRankings.length} teams), league-scoreboard.json (week ${lastCompletedWeek}, ${leagueScoreboard.length} games)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
