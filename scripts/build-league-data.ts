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
import { computeStandings, recordString } from "./lib/standings";
import { computeDivisionStandings } from "./lib/divisionStandings";
import { computeAdjustedEpa } from "./lib/leagueRanks";
import { rankGeneric } from "./lib/rank";
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
  // Deliberately NOT the same blended table used elsewhere on the site —
  // this section is framed as "who's been best in 2026," a pure
  // current-season leaderboard, so it should only reflect 2026 games, not
  // last year's real performance. Still opponent-adjusted (leave-one-out,
  // see leagueRanks.ts), just without the prior-season blend layered on
  // top. Every other EPA rank on the site (Team Strength cards, Next
  // Game's Opponent EPA Rank, etc.) stays on the blended version — those
  // are framed as "how good is this team, really," where leaning on real
  // prior-year data early in the season is the right call.
  const adjusted = computeAdjustedEpa(pbp, ALL_TEAMS);
  const leagueEpaRankings: LeagueEpaRanking[] = ALL_TEAMS.map((team) => {
    const off = rankGeneric(ALL_TEAMS, team, (t) => adjusted.offense.get(t) ?? 0, true);
    const def = rankGeneric(ALL_TEAMS, team, (t) => adjusted.defense.get(t) ?? 0, false);
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
      homeRecord: recordString(standings.get(g.home_team)),
      awayRecord: recordString(standings.get(g.away_team)),
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
