import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStandouts, type ScheduleGame } from "../scripts/lib/standouts";
import type { PbpRow } from "../scripts/lib/pbp";

// A schedule of ordinary results, one per week for `seasons` seasons ending
// in `endSeason`: wins in odd weeks (20-17), losses in even weeks (17-20),
// against a rotating opponent — then one game to test.
function schedule(seasons: number, endSeason: number, last: Partial<ScheduleGame>): ScheduleGame[] {
  const out: ScheduleGame[] = [];
  for (let s = 0; s < seasons; s++) {
    for (let w = 1; w <= 17; w++) {
      const season = String(endSeason - seasons + 1 + s);
      const opp = ["BUF", "NYJ", "MIA", "DEN"][w % 4];
      const win = w % 2 === 1;
      out.push({
        season, week: String(w), gameday: `${season}-09-01`, game_type: "REG",
        home_team: "NE", away_team: opp,
        home_score: win ? "20" : "17", away_score: win ? "17" : "20",
        game_id: `${season}_${w}`,
      });
    }
  }
  out.push({
    season: "2026", week: "4", gameday: "2026-10-04", game_type: "REG",
    home_team: "BUF", away_team: "NE", home_score: "26", away_score: "29", game_id: "2026_04_NE_BUF",
    ...last,
  });
  return out;
}

// Play-by-play for one team-game, `n` scrimmage plays of a given EPA each.
function plays(gameId: string, posteam: string, defteam: string, epa: number, n = 25): PbpRow[] {
  return Array.from({ length: n }, (_, i) => ({
    game_id: gameId, posteam, defteam, home_team: defteam, away_team: posteam,
    play_type: "pass", epa: String(epa), qb_dropback: "1", passer_player_id: `${posteam}-qb`,
    complete_pass: "0", interception: "0", fumble_lost: "0", home_wp: "0.5",
    total_home_score: "0", total_away_score: "0", play_id: String(i),
  }));
}

const nameOf = (id: string) => id;

test("an ordinary game produces nothing", () => {
  // Our 29 points are the most in this whole schedule, so make the game ordinary.
  const games = schedule(3, 2025, { home_score: "20", away_score: "17" });
  const pbp = [...plays("2026_04_NE_BUF", "NE", "BUF", 0.0), ...plays("2026_04_NE_BUF", "BUF", "NE", 0.0)];
  for (let g = 0; g < 20; g++) pbp.push(...plays(`g${g}`, "X", "Y", 0.1), ...plays(`g${g}`, "Y", "X", -0.1));
  assert.deepEqual(buildStandouts({ gameId: "2026_04_NE_BUF", team: "NE", seasonPbp: pbp, games, nameOf }), []);
});

test("the best offensive game of the season is ranked against every team-game", () => {
  const games = schedule(3, 2025, { home_score: "20", away_score: "17" });
  const pbp = [...plays("2026_04_NE_BUF", "NE", "BUF", 0.5), ...plays("2026_04_NE_BUF", "BUF", "NE", 0.0)];
  for (let g = 0; g < 20; g++) pbp.push(...plays(`g${g}`, "X", "Y", 0.1), ...plays(`g${g}`, "Y", "X", -0.1));
  const out = buildStandouts({ gameId: "2026_04_NE_BUF", team: "NE", seasonPbp: pbp, games, nameOf });
  const offense = out.find((s) => s.group === "offense");
  assert.ok(offense);
  assert.match(offense.text, /1st-best offensive game by any team this season: \+0\.50 EPA per play/);
  assert.match(offense.population, /42 team-games this season/);
  // The quarterback's game is the best too, and is its own item.
  assert.ok(out.find((s) => s.group === "qb"));
});

test("history: most points since a date, and first win over an opponent in years", () => {
  // 29 points beats every 20-17 result. NYJ games are the odd weeks, all
  // wins, and the schedule ends in 2022 — four seasons before this game.
  const games = schedule(5, 2022, { home_team: "NYJ" });
  // A loss to NYJ in between — "first since" has to mean something was lost.
  games.splice(games.length - 1, 0, {
    season: "2024", week: "5", gameday: "2024-10-06", game_type: "REG",
    home_team: "NE", away_team: "NYJ", home_score: "10", away_score: "20", game_id: "2024_5",
  });
  const out = buildStandouts({ gameId: "2026_04_NE_BUF", team: "NE", seasonPbp: [], games, nameOf });
  const points = out.find((s) => s.group === "points");
  assert.ok(points);
  assert.match(points.text, /29 points, the most the Patriots have scored since at least 2018/);
  assert.match(points.population, /since 2018 \(87 games\)/);
  const h2h = out.find((s) => s.group === "h2h");
  assert.ok(h2h);
  assert.match(h2h.text, /first win over NYJ since 2022/);
});

test("never more than three, best first, one per group", () => {
  const games = schedule(5, 2022, { home_team: "NYJ" });
  const pbp = [...plays("2026_04_NE_BUF", "NE", "BUF", 0.5), ...plays("2026_04_NE_BUF", "BUF", "NE", -0.5)];
  for (let g = 0; g < 20; g++) pbp.push(...plays(`g${g}`, "X", "Y", 0.1), ...plays(`g${g}`, "Y", "X", -0.1));
  const out = buildStandouts({ gameId: "2026_04_NE_BUF", team: "NE", seasonPbp: pbp, games, nameOf });
  assert.ok(out.length <= 3);
  assert.equal(new Set(out.map((s) => s.group)).size, out.length);
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1].score >= out[i].score);
});
