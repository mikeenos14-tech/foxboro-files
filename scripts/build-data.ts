// Orchestrator: parses data/raw/*.csv (fetched by fetch-nflverse.ts) and
// writes normalized JSON to data/generated/*.json in the exact shapes
// lib/data/types.ts defines, so lib/data/store.ts can read them directly.
//
// Run with: npx tsx scripts/build-data.ts
// (after: npx tsx scripts/fetch-nflverse.ts)

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num, bool01 } from "./lib/csv";
import {
  offenseStats,
  defenseStats,
  thirdDown,
  redZone,
  turnoverMargin,
  winProbabilityTimeline,
  starOfGame,
  scoringSummary,
  penaltyStats,
  mostPenalizedPlayer,
  loadRegularSeasonPbp,
  thirdDownPlays,
  twoMinutePlays,
  fieldGoalAttempts,
  penaltyPlays,
  redZoneTrips,
  turnoverPlays,
  explosivePlays,
  playKey,
  type PbpRow,
  type StarRole,
} from "./lib/pbp";
import { PlayCollector } from "./lib/playRecords";
import {
  computeLeagueEpaTable,
  computeAdjustedEpa,
  offenseSuccessRank,
  defenseSuccessRank,
  offenseExplosiveRank,
  defenseExplosiveRank,
} from "./lib/leagueRanks";
import { computeStandings, recordString, pointDiff, type TeamRecord } from "./lib/standings";
import { computeDivisionStandings } from "./lib/divisionStandings";
import { loadEspnDivisionOrder } from "./lib/espnStandings";
import { AI_VERSION } from "./lib/aiVersion";
import { buildRecapBullets } from "./lib/recapBullets";
import { TEAM_CONFERENCE, TEAM_DIVISION, ALL_TEAMS } from "./lib/teams";
import { rankGeneric } from "./lib/rank";
import { buildLastNWeekWindows, filterRowsToWindow } from "./lib/statWindows";
import { buildLeagueRosterByGsis } from "./lib/roster";
import { simpleWinProb, blendedWinProb } from "./lib/winProbability";
import type {
  Game,
  GameRecap,
  GamePlays,
  PlayGroup,
  SplitPlays,
  ScheduleRow,
  TeamStatSnapshot,
} from "../lib/data/types";

const TEAM = "NE";

// The plays behind each clickable recap stat, from the same selectors
// that count them (pbp.ts). verify-data.ts checks every list against its
// number.
const TURNOVER_BADGE = (r: PbpRow) => (bool01(r.interception) ? "Interception" : "Fumble lost");
const DRIVE_RESULT: Record<string, string> = {
  Touchdown: "Touchdown",
  "Field goal": "Field goal",
  "Missed field goal": "Missed field goal",
  Turnover: "Turnover",
  "Turnover on downs": "Turnover on downs",
  "End of half": "End of half",
  "Opp touchdown": "Defensive touchdown",
};

function buildGamePlays(
  gameRows: PbpRow[],
  opponent: string,
  star: ReturnType<typeof starOfGame>
): GamePlays {
  const collect = new PlayCollector(TEAM);
  const entry = (r: PbpRow, badge?: string, tone?: "good" | "bad") => ({ key: collect.add(r), badge, tone });

  const { giveaways, takeaways } = turnoverPlays(gameRows, TEAM);
  const turnovers: PlayGroup[] = [
    { heading: `New England turnovers (${giveaways.length})`, entries: giveaways.map((r) => entry(r, TURNOVER_BADGE(r), "bad")) },
    { heading: `Takeaways (${takeaways.length})`, entries: takeaways.map((r) => entry(r, TURNOVER_BADGE(r), "good")) },
  ];

  const third = (side: "posteam" | "defteam"): PlayGroup => {
    const plays = thirdDownPlays(gameRows, TEAM, side);
    const conv = plays.filter((r) => bool01(r.third_down_converted)).length;
    const us = side === "posteam";
    return {
      heading: `${us ? "New England" : opponent} on third down — ${conv} of ${plays.length} converted`,
      entries: plays.map((r) =>
        bool01(r.third_down_converted)
          ? entry(r, "Converted", us ? "good" : "bad")
          : entry(r, "Stopped", us ? "bad" : "good")
      ),
    };
  };

  const trips = (side: "posteam" | "defteam"): PlayGroup[] => {
    const us = side === "posteam";
    const all = redZoneTrips(gameRows, TEAM, side);
    return all.map((t, i) => ({
      heading: `${us ? "New England" : opponent} red-zone trip ${i + 1} of ${all.length} · ${DRIVE_RESULT[t.result] ?? t.result}`,
      entries: t.plays.map((r) =>
        bool01(r.touchdown) && r.td_team === r.posteam
          ? entry(r, "Touchdown", us ? "good" : "bad")
          : entry(r)
      ),
    }));
  };

  const explosive = (side: "posteam" | "defteam"): PlayGroup => {
    const plays = explosivePlays(gameRows, TEAM, side);
    const us = side === "posteam";
    return {
      heading: `${us ? "New England" : opponent} explosive plays (${plays.length}) — runs of 10+ and passes of 15+ yards`,
      entries: plays.map((r) => entry(r, `${num(r.yards_gained)} yds`, us ? "good" : "bad")),
    };
  };

  const byKey = new Map(gameRows.map((r) => [playKey(r), r]));
  const starGroup: PlayGroup[] = star
    ? [
        {
          heading: `Every play credited to ${star.playerName} (win probability added)`,
          entries: star.plays
            .filter((p) => byKey.has(p.key))
            .map((p) => {
              const pct = p.wpa * 100;
              return entry(byKey.get(p.key)!, `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% win prob.`, pct >= 0 ? "good" : "bad");
            }),
        },
      ]
    : [];

  return {
    gameId: gameRows[0]?.game_id ?? "",
    plays: collect.plays,
    lists: {
      turnovers,
      thirdDown: [third("posteam"), third("defteam")],
      redZone: [...trips("posteam"), ...trips("defteam")],
      explosive: [explosive("posteam"), explosive("defteam")],
      star: starGroup,
    },
    scrimmagePlays: {
      offense: offenseStats(gameRows, TEAM).plays,
      defense: defenseStats(gameRows, TEAM).plays,
    },
  };
}

// The Splits tab's season plays — same selectors as its numbers, checked
// by verify-data.ts.
function buildSplitPlays(pbp: PbpRow[]): SplitPlays {
  const collect = new PlayCollector(TEAM);
  const entry = (r: PbpRow, badge?: string, tone?: "good" | "bad") => ({ key: collect.add(r), badge, tone });
  const opponentOf = (r: PbpRow) => (r.home_team === TEAM ? r.away_team : r.home_team);

  const trips = (side: "posteam" | "defteam"): PlayGroup[] => {
    const us = side === "posteam";
    const all = redZoneTrips(pbp, TEAM, side);
    return all.map((t) => {
      const first = t.plays[0];
      return {
        heading: `${us ? "New England" : "Opponent"} · Wk ${first ? num(first.week) : "?"} vs ${first ? opponentOf(first) : "?"} · ${DRIVE_RESULT[t.result] ?? t.result}`,
        entries: t.plays.map((r) =>
          bool01(r.touchdown) && r.td_team === r.posteam ? entry(r, "Touchdown", us ? "good" : "bad") : entry(r)
        ),
      };
    });
  };

  const third = (side: "posteam" | "defteam"): PlayGroup => {
    const plays = thirdDownPlays(pbp, TEAM, side);
    const us = side === "posteam";
    const conv = plays.filter((r) => bool01(r.third_down_converted)).length;
    return {
      heading: `${us ? "New England" : "Opponents"} on third down — ${conv} of ${plays.length} converted`,
      entries: plays.map((r) =>
        bool01(r.third_down_converted) ? entry(r, "Converted", us ? "good" : "bad") : entry(r, "Stopped", us ? "bad" : "good")
      ),
    };
  };

  const twoMin = (side: "posteam" | "defteam"): PlayGroup => {
    const plays = twoMinutePlays(pbp, TEAM, side);
    return {
      heading: `${side === "posteam" ? "New England offense" : "New England defense"} in the last two minutes of a half (${plays.length} plays)`,
      entries: plays.map((r) => entry(r)),
    };
  };

  const kicks = fieldGoalAttempts(pbp, TEAM);
  const made = kicks.filter((r) => r.field_goal_result === "made").length;
  const penalties = penaltyPlays(pbp, TEAM);

  return {
    plays: collect.plays,
    lists: {
      redZone: [...trips("posteam"), ...trips("defteam")],
      thirdDown: [third("posteam"), third("defteam")],
      twoMinute: [twoMin("posteam"), twoMin("defteam")],
      fieldGoals: [
        {
          heading: `Field goal attempts — ${made} of ${kicks.length} made`,
          entries: kicks.map((r) =>
            r.field_goal_result === "made"
              ? entry(r, `Good from ${num(r.kick_distance)}`, "good")
              : entry(r, `${r.field_goal_result === "blocked" ? "Blocked" : "No good"} from ${num(r.kick_distance)}`, "bad")
          ),
        },
      ],
      penalties: [
        {
          heading: `Penalties on New England (${penalties.length})`,
          entries: penalties.map((r) => entry(r, `${num(r.penalty_yards)} yds`, "bad")),
        },
      ],
    },
  };
}

// How a player of the game earned it, for the card's one-line reason.
const ROLE_PHRASE: Record<StarRole, string> = {
  passing: "mostly as a passer",
  rushing: "mostly on the ground",
  receiving: "mostly as a receiver",
  defense: "mostly on defense",
  kicking: "mostly as the kicker",
  returns: "mostly on returns",
};
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

async function main() {
  await mkdir(GENERATED_DIR, { recursive: true });

  const games = await loadCsv<GameRow>("games.csv");
  const pbp = await loadRegularSeasonPbp("play_by_play_2026.csv");
  const rosterByGsis = await buildLeagueRosterByGsis();

  const standings = computeStandings(games, SEASON);
  const epaTable = computeLeagueEpaTable(pbp, ALL_TEAMS);
  // Pure current-season, opponent-adjusted EPA (no prior-season blend) —
  // powers the home page's "Team Strength vs. League" EPA cards, which are
  // framed as "how's this year going," not a predictive blend with 2025.
  // Everything else (win probability, schedule projections, playoff odds)
  // stays on epaTable's blended version below.
  const currentSeasonEpa = computeAdjustedEpa(pbp, ALL_TEAMS);

  // Same opponent-adjusted EPA/play, recomputed per "last N weeks" window
  // (see statWindows.ts) so Team Strength can show recent form alongside
  // the full-season default — real opponent-adjustment throughout, not a
  // raw/unadjusted shortcut, since windowing by calendar week (rather
  // than each team's own game count) keeps every team's window aligned to
  // the same games, so an opponent's leave-one-out baseline is always
  // drawn from that same window.
  //
  // Success rate and yards/play are windowed here too. They used not to
  // be, which made the Team Strength filter actively misleading: picking
  // "Last Week" moved the two EPA cards and silently left the other five
  // showing full-season numbers directly under a selector that said
  // "Last Week". A partial filter is worse than no filter.
  const epaPerPlayWindows = buildLastNWeekWindows(pbp).map((window) => {
    const windowRows = filterRowsToWindow(pbp, window);
    const windowedEpa = computeAdjustedEpa(windowRows, ALL_TEAMS);
    // Point differential over the window, from final scores rather than
    // plays. This was previously left season-to-date on the grounds that
    // a cumulative total isn't a per-play rate — but "we're +17 over the
    // last week" is a perfectly coherent stat and exactly what someone
    // filtering to last week is asking for.
    const windowStandings = computeStandings(games, SEASON, window.weeks);
    // Named by what New England actually played in it, so the filter reads
    // "Last Game" like every other one on the site — the window is still
    // calendar weeks underneath (see above), and a bye inside it says so.
    // Game ids name both teams: "2026_03_NE_JAX".
    const ourGames = [...window.gameIds].filter((id) => id.split("_").slice(2).includes(TEAM)).length;
    const weeks = window.weeks?.size ?? window.games;
    const label =
      ourGames === weeks
        ? weeks === 1
          ? "Last Game"
          : `Last ${weeks} Games`
        : `Last ${weeks} Weeks (${ourGames} game${ourGames === 1 ? "" : "s"})`;
    return {
      key: window.key,
      label,
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => windowedEpa.offense.get(t) ?? 0, true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => windowedEpa.defense.get(t) ?? 0, false),
      successRate: {
        offense: rankGeneric(ALL_TEAMS, TEAM, (t) => offenseStats(windowRows, t).successRate, true),
        defense: rankGeneric(ALL_TEAMS, TEAM, (t) => defenseStats(windowRows, t).successRate, false),
      },
      yardsPerPlay: {
        offense: rankGeneric(ALL_TEAMS, TEAM, (t) => offenseStats(windowRows, t).yardsPerPlay, true),
        defense: rankGeneric(ALL_TEAMS, TEAM, (t) => defenseStats(windowRows, t).yardsPerPlay, false),
      },
      pointDifferential: rankGeneric(ALL_TEAMS, TEAM, (t) => pointDiff(windowStandings.get(t)), true),
    };
  });

  // ---------- Division standings ----------
  const ourDivision = TEAM_DIVISION[TEAM];
  const divisionTeams = ALL_TEAMS.filter((t) => TEAM_DIVISION[t] === ourDivision);
  const divisionStandings = computeDivisionStandings(
    games,
    SEASON,
    divisionTeams,
    standings,
    TEAM,
    await loadEspnDivisionOrder()
  );

  await writeFile(
    path.join(GENERATED_DIR, "division-standings.json"),
    JSON.stringify(divisionStandings, null, 2)
  );

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

  // Real market spreads, where ESPN has posted them. Only the current
  // week's games are priced, so this improves one game's estimate rather
  // than the whole schedule — but that's the game anyone actually cares
  // about this week, and the data was already being fetched and used for
  // display only.
  const marketSpreadByGameId = new Map<string, number>();
  try {
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "raw", "espn-scoreboard.json"), "utf-8")
    );
    for (const event of raw.events ?? []) {
      const comp = event.competitions?.[0];
      const spread = comp?.odds?.[0]?.spread;
      if (typeof spread !== "number") continue;
      const competitors: Array<{ homeAway: string; team: { abbreviation: string } }> =
        comp.competitors ?? [];
      const home = competitors.find((c) => c.homeAway === "home")?.team?.abbreviation;
      const away = competitors.find((c) => c.homeAway === "away")?.team?.abbreviation;
      if (home !== TEAM && away !== TEAM) continue;
      const match = games.find(
        (gm) =>
          num(gm.season) === SEASON &&
          gm.home_team === home &&
          gm.away_team === away &&
          (gm.home_score === "" || gm.home_score === undefined)
      );
      // ESPN's spread is relative to the home team; flip when we're away.
      if (match) marketSpreadByGameId.set(match.game_id, home === TEAM ? spread : -spread);
    }
  } catch {
    // No scoreboard cached — every estimate simply stays EPA-only.
  }

  // epaTable's offenseEpa/defenseEpa are already opponent-adjusted and
  // blended with real prior-season performance (see computeLeagueEpaTable
  // in leagueRanks.ts) — net is just the difference of those two, so both
  // this win-probability input and the displayed EPA rank badges are
  // driven by the exact same numbers.
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
      ourScore: ourScore ?? undefined,
      theirScore: theirScore ?? undefined,
      winProbabilityEstimate: result
        ? undefined
        : blendedWinProb(
            simpleWinProb(netEpaOf(TEAM) - netEpaOf(opponent), isHome),
            marketSpreadByGameId.get(g.game_id)
          ),
      date: g.gameday,
      // Lets any archived recap render its own header, not just the
      // most recent game's.
      venue: g.stadium || undefined,
      kickoffTimeEt: g.gametime || undefined,
    };
  });

  await writeFile(
    path.join(GENERATED_DIR, "schedule.json"),
    JSON.stringify(schedule, null, 2)
  );

  // ---------- Season projection ----------
  // Built from real inputs (actual results so far + our own per-game win
  // probability estimates above), but the combination is our own simplified
  // model, not a full playoff simulation — same honesty framing as the
  // per-game win probabilities themselves.
  const currentWins = schedule.filter((r) => r.result === "W").length;
  const currentTies = schedule.filter((r) => r.result === "T").length;
  const expectedAdditionalWins = schedule
    .filter((r) => !r.result)
    .reduce((sum, r) => sum + (r.winProbabilityEstimate ?? 0.5), 0);
  const expectedWins = currentWins + currentTies * 0.5 + expectedAdditionalWins;
  const projectedWins = Math.round(expectedWins);
  const projectedLosses = schedule.length - projectedWins;
  // Simplified playoff-odds curve centered on a typical wildcard cutoff
  // (~9.5 wins in a 17-game season) — not a real playoff simulation across
  // the whole conference, just a smooth function of projected win total.
  // Fed the unrounded total: rounding first made 8.02 and 8.49 projected
  // wins read as the same 27%, and the odds jumped in steps.
  const playoffOdds = 1 / (1 + Math.exp(-(expectedWins - 9.5) / 1.5));

  await writeFile(
    path.join(GENERATED_DIR, "season-projection.json"),
    JSON.stringify({ projectedWins, projectedLosses, playoffOdds }, null, 2)
  );

  // ---------- Last / Next game ----------
  const played = teamGames.filter((g) => g.home_score !== "" && g.home_score !== undefined);
  const upcoming = teamGames.filter((g) => g.home_score === "" || g.home_score === undefined);
  const lastRow = played[played.length - 1];
  const nextRow = upcoming[0];

  // TV network, from ESPN's scoreboard. It covers only the current week,
  // so for a game it doesn't list the field is left out rather than
  // carrying last week's network forward.
  const networkByGameKey = new Map<string, string>();
  try {
    const raw = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "raw", "espn-scoreboard.json"), "utf-8")
    );
    for (const event of raw.events ?? []) {
      const comp = event.competitions?.[0];
      const competitors: Array<{ homeAway: string; team: { abbreviation: string } }> = comp?.competitors ?? [];
      const home = competitors.find((c) => c.homeAway === "home")?.team?.abbreviation;
      const away = competitors.find((c) => c.homeAway === "away")?.team?.abbreviation;
      const network: string | undefined = comp?.broadcasts?.[0]?.names?.[0] ?? comp?.geoBroadcasts?.[0]?.media?.shortName;
      if (home && away && network) networkByGameKey.set(`${away}@${home}`, network);
    }
  } catch {
    // No scoreboard: no network shown.
  }

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
    network: networkByGameKey.get(`${g.away_team}@${g.home_team}`),
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
    const rows = twoMinutePlays(pbp, t, side);
    if (rows.length === 0) return 0;
    return rows.reduce((sum, r) => sum + num(r.epa), 0) / rows.length;
  };
  const fgPct = (t: string) => {
    const attempts = fieldGoalAttempts(pbp, t);
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
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => currentSeasonEpa.offense.get(t) ?? 0, true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => currentSeasonEpa.defense.get(t) ?? 0, false),
    },
    epaPerPlayWindows,
    successRate: {
      offense: offenseSuccessRank(epaTable, TEAM),
      defense: defenseSuccessRank(epaTable, TEAM),
    },
    yardsPerPlay: {
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => offenseStats(pbp, t).yardsPerPlay, true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => defenseStats(pbp, t).yardsPerPlay, false),
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
    discipline: {
      penaltiesCommitted: rankGeneric(ALL_TEAMS, TEAM, (t) => penaltyStats(pbp, t).count, false),
      penaltyYardsCommitted: rankGeneric(ALL_TEAMS, TEAM, (t) => penaltyStats(pbp, t).yards, false),
      mostPenalized: (() => {
        const mp = mostPenalizedPlayer(pbp, TEAM);
        if (!mp) return undefined;
        return { playerName: rosterByGsis.get(mp.playerId)?.full_name ?? mp.playerName, count: mp.count };
      })(),
    },
  };

  await writeFile(
    path.join(GENERATED_DIR, "team-stats.json"),
    JSON.stringify(teamStats, null, 2)
  );
  await writeFile(path.join(GENERATED_DIR, "split-plays.json"), JSON.stringify(buildSplitPlays(pbp), null, 2));

  // ---------- Recap for every completed game ----------
  // Rebuilt for all of them, not just the latest: it's cheap and
  // deterministic, and it means a fix to how recaps are computed (full
  // player names, the scoring breakdown) reaches the whole archive
  // instead of only whichever game happens to be most recent.
  // Season-to-date, every team: the "normal" a game's rate is read against.
  const scrimmage = pbp.filter((r) => r.play_type === "run" || r.play_type === "pass");
  const leagueSuccessRate = scrimmage.filter((r) => bool01(r.success)).length / Math.max(1, scrimmage.length);
  for (const lastRow of played) {
    const gameRows = pbp.filter((r) => r.game_id === lastRow.game_id);
    // A game can be final in games.csv before its play-by-play lands.
    if (gameRows.length === 0) continue;
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
    const starRoster = star ? rosterByGsis.get(star.playerId) : undefined;
    const starHeadshot = starRoster?.headshot_url;

    const recap: GameRecap = {
      gameId: lastRow.game_id,
      narrative: `New England ${won ? "beat" : "fell to"} ${opponent} ${usScore}-${themScore}. The offense posted ${off.epa.toFixed(2)} EPA/play (${(off.successRate * 100).toFixed(0)}% success rate) while the defense allowed ${def.epa.toFixed(2)} EPA/play. Turnover margin was ${margin > 0 ? "+" : ""}${margin}.`,
      epaPerPlay: { offense: off.epa, defense: def.epa },
      successRate: { offense: off.successRate, defense: def.successRate, leagueAverage: leagueSuccessRate },
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
      // Filled in below from the finished stats (recapBullets.ts).
      goodBadUgly: { good: [], bad: [], ugly: [] },
      playerOfTheGame: star
        ? {
            playerId: star.playerId,
            // The roster's full name, not play-by-play's "R.Stevenson" —
            // handed the abbreviation, the AI writer filled in "Remy".
            playerName: starRoster?.full_name || star.playerName,
            wpa: star.wpa,
            headshotUrl: starHeadshot || undefined,
            reason:
              star.wpa > 0
                // The card already shows the number; this says how it was earned.
                ? `${ROLE_PHRASE[star.role].charAt(0).toUpperCase()}${ROLE_PHRASE[star.role].slice(1)}.`
                : `New England's best, though still net-negative — ${ROLE_PHRASE[star.role]}.`,
          }
        : { playerId: "", playerName: "N/A", wpa: 0, reason: "No standout WPA leader computed." },
      scoring: { us: scoringSummary(gameRows, TEAM), them: scoringSummary(gameRows, opponent) },
    };
    recap.goodBadUgly = buildRecapBullets(recap, opponent);
    await writeFile(
      path.join(GENERATED_DIR, `plays-${lastRow.game_id}.json`),
      JSON.stringify(buildGamePlays(gameRows, opponent, star), null, 2)
    );

    // Preserve any AI-authored fields already on disk. This file is
    // rebuilt from scratch on every run, but fanTake/goodBadUgly are
    // written later by build-ai-recap.ts and cost a real API call. Without
    // this merge, any run where the AI step doesn't execute (no
    // ANTHROPIC_API_KEY locally, or a soft failure in CI) silently
    // replaces a real written recap with the generic template strings
    // above and there's no way to get it back. build-ai-recap.ts only
    // regenerates fanTake when it's absent, so a wipe here is permanent.
    const recapPath = path.join(GENERATED_DIR, `recap-${lastRow.game_id}.json`);
    let merged: GameRecap = recap;
    try {
      const existing = JSON.parse(await readFile(recapPath, "utf-8")) as Partial<GameRecap>;
      // Only text written under the current prompt version carries over;
      // older text is dropped so the plain recap shows until a rewrite
      // passes the checks (see scripts/lib/aiVersion.ts).
      if (existing.fanTake && existing.aiVersion === AI_VERSION) {
        // Only the Take is AI-written; Good/Bad/Ugly always comes fresh
        // from the stats above.
        merged = { ...recap, fanTake: existing.fanTake, aiVersion: existing.aiVersion };
      }
    } catch {
      // No existing recap (first run for this game) — write the fresh one.
    }

    await writeFile(recapPath, JSON.stringify(merged, null, 2));
  }

  // Derived directly from whichever recap-<gameId>.json files actually
  // exist on disk, rather than trusting/appending to a separately
  // tracked index — self-healing (a previous run had overwritten this
  // index with only the single most-recent game every time, silently
  // hiding every earlier recap even though its file was still right
  // there) and can't drift out of sync with the real files again.
  const files = await readdir(GENERATED_DIR);
  const fullIndex = files
    .filter((f) => f.startsWith("recap-") && f.endsWith(".json") && f !== "recap-index.json")
    .map((f) => f.slice("recap-".length, -".json".length))
    .sort();
  await writeFile(
    path.join(GENERATED_DIR, "recap-index.json"),
    JSON.stringify(fullIndex, null, 2)
  );

  console.log("Data build complete →", GENERATED_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
