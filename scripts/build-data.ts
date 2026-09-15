// Orchestrator: parses data/raw/*.csv (fetched by fetch-nflverse.ts) and
// writes normalized JSON to data/generated/*.json in the exact shapes
// lib/data/types.ts defines, so lib/data/store.ts can read them directly.
//
// Run with: npx tsx scripts/build-data.ts
// (after: npx tsx scripts/fetch-nflverse.ts)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num, bool01 } from "./lib/csv";
import {
  offenseStats,
  defenseStats,
  successByDown,
  thirdDown,
  redZone,
  turnoverMargin,
  winProbabilityTimeline,
  starOfGame,
  type PbpRow,
} from "./lib/pbp";
import {
  computeLeagueEpaTable,
  offenseEpaRank,
  defenseEpaRank,
  offenseSuccessRank,
  defenseSuccessRank,
  offenseExplosiveRank,
  defenseExplosiveRank,
} from "./lib/leagueRanks";
import { computeStandings, recordString, pointDiff, type TeamRecord } from "./lib/standings";
import { TEAM_CONFERENCE, ALL_TEAMS } from "./lib/teams";
import { rankGeneric } from "./lib/rank";
import type {
  Game,
  GameRecap,
  ScheduleRow,
  TeamStatSnapshot,
} from "../lib/data/types";
import { signed } from "../lib/util/format";

const TEAM = "NE";
const SEASON = 2026;
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

type GameRow = Record<string, string>;

function teamSos(
  team: string,
  games: GameRow[],
  standings: Map<string, TeamRecord>
): number {
  const opponents: string[] = [];
  for (const g of games) {
    if (num(g.season) !== SEASON || g.game_type !== "REG") continue;
    if (g.home_score === "" || g.home_score === undefined) continue;
    if (g.home_team === team) opponents.push(g.away_team);
    else if (g.away_team === team) opponents.push(g.home_team);
  }
  if (opponents.length === 0) return 0;
  const total = opponents.reduce((sum, opp) => sum + pointDiff(standings.get(opp)), 0);
  return total / opponents.length;
}

function simpleWinProb(netEpaDiff: number, isHome: boolean): number {
  // Rough heuristic, explicitly not a real predictive model: maps EPA/play
  // differential through a bounded curve, plus a small home-field bump.
  // Scale factor kept modest so early-season, small-sample EPA gaps don't
  // saturate the estimate to the clamp floor/ceiling on nearly every game.
  const scaled = Math.tanh(netEpaDiff * 2.5);
  const base = 0.5 + 0.5 * scaled;
  const homeBump = isHome ? 0.025 : -0.025;
  return Math.min(0.9, Math.max(0.1, base + homeBump));
}

async function main() {
  await mkdir(GENERATED_DIR, { recursive: true });

  const games = await loadCsv<GameRow>("games.csv");
  const pbp = await loadCsv<PbpRow>("play_by_play_2026.csv");

  const standings = computeStandings(games, SEASON);
  const epaTable = computeLeagueEpaTable(pbp, ALL_TEAMS);

  // ---------- Schedule ----------
  const teamGames = games
    .filter(
      (g) =>
        num(g.season) === SEASON &&
        g.game_type === "REG" &&
        (g.home_team === TEAM || g.away_team === TEAM)
    )
    .sort((a, b) => num(a.week) - num(b.week));

  const neSos = teamSos(TEAM, games, standings);

  const netEpaOf = (t: string) => {
    const e = epaTable.get(t);
    return e ? e.offenseEpa - e.defenseEpa : 0;
  };

  const schedule: ScheduleRow[] = teamGames.map((g) => {
    const isHome = g.home_team === TEAM;
    const opponent = isHome ? g.away_team : g.home_team;
    const played = g.home_score !== "" && g.home_score !== undefined;
    const ourScore = played ? num(isHome ? g.home_score : g.away_score) : null;
    const theirScore = played ? num(isHome ? g.away_score : g.home_score) : null;

    let result: "W" | "L" | "T" | undefined;
    if (played && ourScore !== null && theirScore !== null) {
      result = ourScore > theirScore ? "W" : ourScore < theirScore ? "L" : "T";
    }

    const opponentRank = rankGeneric(ALL_TEAMS, opponent, netEpaOf, true);

    return {
      gameId: g.game_id,
      week: num(g.week),
      opponent,
      homeAway: isHome ? "home" : "away",
      opponentRecord: recordString(standings.get(opponent)),
      opponentPointDiff: pointDiff(standings.get(opponent)),
      opponentEpaRank: opponentRank.leagueRank,
      strengthOfSchedule: { season: neSos, opponentSos: teamSos(opponent, games, standings) },
      restDays: num(isHome ? g.home_rest : g.away_rest, 7),
      opponentRestDays: num(isHome ? g.away_rest : g.home_rest, 7),
      isDivisional: bool01(g.div_game),
      isConference: TEAM_CONFERENCE[opponent] === TEAM_CONFERENCE[TEAM],
      result,
      winProbabilityEstimate: result
        ? undefined
        : simpleWinProb(netEpaOf(TEAM) - netEpaOf(opponent), isHome),
      date: g.gameday,
    };
  });

  await writeFile(
    path.join(GENERATED_DIR, "schedule.json"),
    JSON.stringify(schedule, null, 2)
  );

  // ---------- Last / Next game ----------
  const played = teamGames.filter((g) => g.home_score !== "" && g.home_score !== undefined);
  const upcoming = teamGames.filter((g) => g.home_score === "" || g.home_score === undefined);
  const lastRow = played[played.length - 1];
  const nextRow = upcoming[0];

  const toGame = (g: GameRow): Game => ({
    id: g.game_id,
    season: SEASON,
    week: num(g.week),
    seasonType: "REG",
    date: g.gameday,
    kickoffTimeEt: g.gametime || undefined,
    homeTeam: g.home_team,
    awayTeam: g.away_team,
    homeScore: g.home_score !== "" ? num(g.home_score) : undefined,
    awayScore: g.away_score !== "" ? num(g.away_score) : undefined,
    status: g.home_score !== "" && g.home_score !== undefined ? "final" : "scheduled",
    venue: g.stadium || "",
  });

  if (lastRow) {
    await writeFile(
      path.join(GENERATED_DIR, "last-game.json"),
      JSON.stringify(toGame(lastRow), null, 2)
    );
  }
  if (nextRow) {
    await writeFile(
      path.join(GENERATED_DIR, "next-game.json"),
      JSON.stringify(toGame(nextRow), null, 2)
    );
  }

  // ---------- Team stats snapshot ----------
  const rzPct = (t: string, side: "posteam" | "defteam") => {
    const rz = redZone(pbp, t, side);
    return rz.att === 0 ? 0 : rz.td / rz.att;
  };
  const thirdPct = (t: string, side: "posteam" | "defteam") => {
    const td = thirdDown(pbp, t, side);
    return td.att === 0 ? 0 : td.conv / td.att;
  };
  const twoMinEpa = (t: string, side: "posteam" | "defteam") => {
    const rows = pbp.filter(
      (r) => r[side] === t && (r.play_type === "pass" || r.play_type === "run") && num(r.half_seconds_remaining, 999) <= 120
    );
    if (rows.length === 0) return 0;
    return rows.reduce((sum, r) => sum + num(r.epa), 0) / rows.length;
  };
  const fgPct = (t: string) => {
    const attempts = pbp.filter((r) => r.posteam === t && r.play_type === "field_goal");
    if (attempts.length === 0) return 0;
    return attempts.filter((r) => r.field_goal_result === "made").length / attempts.length;
  };
  const netPunting = (t: string) => {
    const punts = pbp.filter((r) => r.posteam === t && r.play_type === "punt");
    if (punts.length === 0) return 0;
    return (
      punts.reduce((sum, r) => sum + num(r.kick_distance) - num(r.return_yards), 0) /
      punts.length
    );
  };
  const kickReturnAvg = (t: string) => {
    const returns = pbp.filter((r) => r.return_team === t && r.play_type === "kickoff");
    if (returns.length === 0) return 0;
    return returns.reduce((sum, r) => sum + num(r.return_yards), 0) / returns.length;
  };
  const puntReturnAvg = (t: string) => {
    const returns = pbp.filter((r) => r.return_team === t && r.play_type === "punt");
    if (returns.length === 0) return 0;
    return returns.reduce((sum, r) => sum + num(r.return_yards), 0) / returns.length;
  };
  const specialTeamsEpa = (t: string) => {
    const rows = pbp.filter(
      (r) => r.posteam === t && ["field_goal", "punt", "kickoff"].includes(r.play_type)
    );
    if (rows.length === 0) return 0;
    return rows.reduce((sum, r) => sum + num(r.epa), 0) / rows.length;
  };

  const neRecord = standings.get(TEAM);
  const wPow = 2.37;
  const pf = neRecord?.pointsFor ?? 0;
  const pa = neRecord?.pointsAgainst ?? 1;
  const pythag = pf === 0 && pa === 0 ? 0.5 : Math.pow(pf, wPow) / (Math.pow(pf, wPow) + Math.pow(pa, wPow));

  const homeGames = played.filter((g) => g.home_team === TEAM);
  const awayGames = played.filter((g) => g.away_team === TEAM);
  const divGames = played.filter((g) => bool01(g.div_game));
  const winLoss = (rows: GameRow[]) => {
    let w = 0, l = 0;
    for (const g of rows) {
      const isHome = g.home_team === TEAM;
      const us = num(isHome ? g.home_score : g.away_score);
      const them = num(isHome ? g.away_score : g.home_score);
      if (us > them) w++;
      else if (them > us) l++;
    }
    return { wins: w, losses: l };
  };

  const teamStats: TeamStatSnapshot = {
    team: TEAM,
    season: SEASON,
    epaPerPlay: {
      offense: offenseEpaRank(epaTable, TEAM),
      defense: defenseEpaRank(epaTable, TEAM),
    },
    successRate: {
      offense: offenseSuccessRank(epaTable, TEAM),
      defense: defenseSuccessRank(epaTable, TEAM),
    },
    explosivePlayRate: {
      offense: offenseExplosiveRank(epaTable, TEAM),
      defense: defenseExplosiveRank(epaTable, TEAM),
    },
    pointDifferential: rankGeneric(ALL_TEAMS, TEAM, (t) => pointDiff(standings.get(t)), true),
    pythagoreanWinPct: pythag,
    redZonePct: {
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => rzPct(t, "posteam"), true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => rzPct(t, "defteam"), false),
    },
    thirdDownPct: {
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => thirdPct(t, "posteam"), true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => thirdPct(t, "defteam"), false),
    },
    twoMinuteDrillEpa: {
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => twoMinEpa(t, "posteam"), true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => twoMinEpa(t, "defteam"), false),
    },
    splits: {
      home: { ...winLoss(homeGames), epaPerPlay: offenseStats(pbp.filter((r) => homeGames.some((g) => g.game_id === r.game_id)), TEAM).epa },
      away: { ...winLoss(awayGames), epaPerPlay: offenseStats(pbp.filter((r) => awayGames.some((g) => g.game_id === r.game_id)), TEAM).epa },
      divisional: winLoss(divGames),
    },
    specialTeams: {
      fieldGoalPct: rankGeneric(ALL_TEAMS, TEAM, fgPct, true),
      netPuntingAvg: rankGeneric(ALL_TEAMS, TEAM, netPunting, true),
      kickReturnAvg: rankGeneric(ALL_TEAMS, TEAM, kickReturnAvg, true),
      puntReturnAvg: rankGeneric(ALL_TEAMS, TEAM, puntReturnAvg, true),
      specialTeamsEpa: rankGeneric(ALL_TEAMS, TEAM, specialTeamsEpa, true),
    },
  };

  await writeFile(
    path.join(GENERATED_DIR, "team-stats.json"),
    JSON.stringify(teamStats, null, 2)
  );

  // ---------- Recap for the most recent completed game ----------
  if (lastRow) {
    const gameRows = pbp.filter((r) => r.game_id === lastRow.game_id);
    const off = offenseStats(gameRows, TEAM);
    const def = defenseStats(gameRows, TEAM);
    const opponent = lastRow.home_team === TEAM ? lastRow.away_team : lastRow.home_team;
    const oppOff = offenseStats(gameRows, opponent);
    const isHome = lastRow.home_team === TEAM;
    const usScore = num(isHome ? lastRow.home_score : lastRow.away_score);
    const themScore = num(isHome ? lastRow.away_score : lastRow.home_score);
    const won = usScore > themScore;

    const star = starOfGame(gameRows, TEAM);
    const margin = turnoverMargin(gameRows, TEAM);

    const recap: GameRecap = {
      gameId: lastRow.game_id,
      narrative: `New England ${won ? "beat" : "fell to"} ${opponent} ${usScore}-${themScore}. The offense posted ${off.epa.toFixed(2)} EPA/play (${(off.successRate * 100).toFixed(0)}% success rate) while the defense allowed ${def.epa.toFixed(2)} EPA/play. Turnover margin was ${margin > 0 ? "+" : ""}${margin}.`,
      epaPerPlay: { offense: off.epa, defense: def.epa },
      successRate: {
        offenseByDown: successByDown(gameRows, TEAM, "posteam"),
        defenseByDown: successByDown(gameRows, TEAM, "defteam"),
      },
      turnoverMargin: turnoverMargin(gameRows, TEAM),
      pointsOffTurnovers: { for: 0, against: 0 },
      explosivePlayRate: { for: off.explosiveRate, against: oppOff.explosiveRate },
      redZone: {
        offense: redZone(gameRows, TEAM, "posteam"),
        defense: redZone(gameRows, TEAM, "defteam"),
      },
      thirdDown: {
        offense: thirdDown(gameRows, TEAM, "posteam"),
        defense: thirdDown(gameRows, TEAM, "defteam"),
      },
      winProbabilityTimeline: winProbabilityTimeline(gameRows),
      starOfTheGame: star ?? { playerId: "", playerName: "N/A", wpa: 0 },
      goodBadUgly: {
        good: [
          off.epa > 0
            ? `Offense generated positive EPA/play (${off.epa.toFixed(2)}).`
            : `Defense held opponent to ${def.epa.toFixed(2)} EPA/play allowed.`,
        ],
        bad: [
          off.epa <= 0
            ? `Offense generated negative EPA/play (${off.epa.toFixed(2)}).`
            : `Defense allowed ${def.epa.toFixed(2)} EPA/play.`,
        ],
        ugly: margin < 0 ? [`Turnover margin was ${margin}.`] : [],
      },
      playerOfTheGame: star
        ? {
            playerId: star.playerId,
            playerName: star.playerName,
            reason:
              star.wpa > 0
                ? `Led the team with ${signed(star.wpa * 100, 0)}% win probability added.`
                : `Had the team's best (though still net-negative) win probability contribution at ${signed(star.wpa * 100, 0)}% in a tough game offensively.`,
          }
        : { playerId: "", playerName: "N/A", reason: "No standout WPA leader computed." },
    };

    await writeFile(
      path.join(GENERATED_DIR, `recap-${lastRow.game_id}.json`),
      JSON.stringify(recap, null, 2)
    );
    await writeFile(
      path.join(GENERATED_DIR, "recap-index.json"),
      JSON.stringify([lastRow.game_id], null, 2)
    );
  }

  console.log("Data build complete →", GENERATED_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
