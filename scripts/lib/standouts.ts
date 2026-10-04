// "What Stood Out": after a game, the things that were genuinely rare.
//
// Every item is a fixed check computed in code, with its comparison
// population spelled out and a real number or date attached. Nothing here
// is an AI's opinion of what mattered; the AI (build-ai-recap.ts) is only
// handed these as facts. The checks are allowed to find nothing — an
// ordinary game correctly produces an empty list — and the output is
// capped at three, best first.
//
// Two populations, both honest about their limits:
//   - This season's play-by-play, all 32 teams: "the 4th-best offensive
//     game by any team this season (of 128)". Grows every week.
//   - The schedule file's results since 1999: "the most points in a road
//     game since Week 12, 2024". Scores and dates only, no stats.
// The 2025 play-by-play isn't kept by the automated jobs, so no claim
// reaches back a season on a stat; those say "this season".

import { bool01, num } from "./csv";
import type { PbpRow } from "./pbp";
import type { Standout } from "../../lib/data/types";

// Standout (lib/data/types.ts): one per `group` — the highest score wins,
// so a 40-point game doesn't produce "most points" and "biggest margin"
// both; `population` is what it was compared against, shown under the
// text; `score` is 0–1 rarity, and only items ≥ RARITY_FLOOR are kept.
export type { Standout };

export interface ScheduleGame {
  season: string;
  week: string;
  gameday: string;
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  game_id: string;
  game_type: string;
}

const RARITY_FLOOR = 0.9; // top 10%
const MAX_STANDOUTS = 3;
const MIN_DROPBACKS = 15;
const MIN_PLAYER_YARDS = 100;

const isScrimmage = (r: PbpRow) => r.play_type === "run" || r.play_type === "pass";
const rusherOf = (r: PbpRow) => r.rusher_player_id || r.rusher_id || "";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** Rank of `value` among `all` (1 = most extreme in the direction asked). */
function rankOf(value: number, all: number[], higherIsBetter: boolean): { rank: number; of: number } {
  const better = all.filter((v) => (higherIsBetter ? v > value : v < value)).length;
  return { rank: better + 1, of: all.length };
}
const rankScore = (rank: number, of: number) => (of <= 1 ? 0 : 1 - (rank - 1) / (of - 1));

// ---------- This season, all 32 teams ----------

interface TeamGame {
  gameId: string;
  team: string;
  offenseEpa: number;
  defenseEpa: number;
  takeaways: number;
}

function teamGames(season: PbpRow[]): TeamGame[] {
  const acc = new Map<string, { off: number[]; def: number[]; takeaways: number }>();
  const get = (gameId: string, team: string) => {
    const key = `${gameId}:${team}`;
    let v = acc.get(key);
    if (!v) acc.set(key, (v = { off: [], def: [], takeaways: 0 }));
    return v;
  };
  for (const r of season) {
    if (!r.posteam || !r.defteam) continue;
    if (isScrimmage(r) && r.epa && r.epa !== "NA") {
      get(r.game_id, r.posteam).off.push(num(r.epa));
      get(r.game_id, r.defteam).def.push(num(r.epa));
    }
    if (bool01(r.interception) || bool01(r.fumble_lost)) get(r.game_id, r.defteam).takeaways += 1;
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return [...acc.entries()]
    .filter(([, v]) => v.off.length >= 20)
    .map(([key, v]) => {
      const [gameId, team] = key.split(":");
      return { gameId, team, offenseEpa: mean(v.off), defenseEpa: mean(v.def), takeaways: v.takeaways };
    });
}

function teamGameStandouts(gameId: string, team: string, all: TeamGame[]): Standout[] {
  const mine = all.find((g) => g.gameId === gameId && g.team === team);
  if (!mine) return [];
  const out: Standout[] = [];
  const pop = `all ${all.length} team-games this season`;

  for (const [group, value, higherIsBetter, label] of [
    ["offense", mine.offenseEpa, true, "offensive"],
    ["defense", mine.defenseEpa, false, "defensive"],
  ] as const) {
    const values = all.map((g) => (group === "offense" ? g.offenseEpa : g.defenseEpa));
    const best = rankOf(value, values, higherIsBetter);
    const worst = rankOf(value, values, !higherIsBetter);
    const signed = `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
    if (rankScore(best.rank, best.of) >= RARITY_FLOOR) {
      out.push({
        group,
        text: `The ${ordinal(best.rank)}-best ${label} game by any team this season: ${signed} EPA per play${group === "defense" ? " allowed" : ""}.`,
        population: pop,
        score: rankScore(best.rank, best.of),
        tone: "good",
      });
    } else if (rankScore(worst.rank, worst.of) >= RARITY_FLOOR) {
      out.push({
        group,
        text: `The ${ordinal(worst.rank)}-worst ${label} game by any team this season: ${signed} EPA per play${group === "defense" ? " allowed" : ""}.`,
        population: pop,
        score: rankScore(worst.rank, worst.of),
        tone: "bad",
      });
    }
  }

  if (mine.takeaways >= 3) {
    const asMany = all.filter((g) => g.takeaways >= mine.takeaways).length;
    const score = 1 - asMany / all.length;
    if (score >= RARITY_FLOOR) {
      out.push({
        group: "takeaways",
        text: `${mine.takeaways} takeaways — only ${asMany} of ${all.length} team-games this season have had that many.`,
        population: pop,
        score,
        tone: "good",
      });
    }
  }
  return out;
}

interface PlayerGame {
  gameId: string;
  team: string;
  playerId: string;
  value: number;
}

function playerGames(season: PbpRow[], kind: "passing" | "receiving" | "rushing"): PlayerGame[] {
  const acc = new Map<string, { team: string; sum: number; n: number }>();
  for (const r of season) {
    let id = "";
    let v = 0;
    if (kind === "passing") {
      if (!bool01(r.qb_dropback) || !r.passer_player_id || !r.epa || r.epa === "NA") continue;
      id = r.passer_player_id;
      v = num(r.epa);
    } else if (kind === "receiving") {
      if (!bool01(r.complete_pass) || !r.receiver_player_id) continue;
      id = r.receiver_player_id;
      v = num(r.receiving_yards);
    } else {
      if (r.play_type !== "run" || !rusherOf(r) || bool01(r.two_point_attempt)) continue;
      id = rusherOf(r);
      v = num(r.rushing_yards);
    }
    const key = `${r.game_id}:${id}`;
    const cur = acc.get(key) ?? { team: r.posteam, sum: 0, n: 0 };
    cur.sum += v;
    cur.n += 1;
    acc.set(key, cur);
  }
  return [...acc.entries()]
    .filter(([, v]) => kind !== "passing" || v.n >= MIN_DROPBACKS)
    .map(([key, v]) => {
      const [gameId, playerId] = key.split(":");
      // Passing is EPA per dropback; yards are totals.
      return { gameId, team: v.team, playerId, value: kind === "passing" ? v.sum / v.n : v.sum };
    });
}

function playerStandouts(
  gameId: string,
  team: string,
  season: PbpRow[],
  nameOf: (playerId: string) => string
): Standout[] {
  const out: Standout[] = [];

  const qbs = playerGames(season, "passing");
  for (const mine of qbs.filter((g) => g.gameId === gameId && g.team === team)) {
    const values = qbs.map((g) => g.value);
    const best = rankOf(mine.value, values, true);
    const worst = rankOf(mine.value, values, false);
    const pop = `all ${qbs.length} quarterback games this season with ${MIN_DROPBACKS}+ dropbacks`;
    const signed = `${mine.value >= 0 ? "+" : ""}${mine.value.toFixed(2)}`;
    if (rankScore(best.rank, best.of) >= RARITY_FLOOR) {
      out.push({
        group: "qb",
        text: `${nameOf(mine.playerId)}'s ${signed} EPA per dropback is the ${ordinal(best.rank)}-best quarterback game in the NFL this season.`,
        population: pop,
        score: rankScore(best.rank, best.of),
        tone: "good",
      });
    } else if (rankScore(worst.rank, worst.of) >= RARITY_FLOOR) {
      out.push({
        group: "qb",
        text: `${nameOf(mine.playerId)}'s ${signed} EPA per dropback is the ${ordinal(worst.rank)}-worst quarterback game in the NFL this season.`,
        population: pop,
        score: rankScore(worst.rank, worst.of),
        tone: "bad",
      });
    }
  }

  for (const [kind, what] of [
    ["receiving", "receiving yards"],
    ["rushing", "rushing yards"],
  ] as const) {
    const games = playerGames(season, kind);
    const values = games.map((g) => g.value);
    for (const mine of games.filter((g) => g.gameId === gameId && g.team === team && g.value >= MIN_PLAYER_YARDS)) {
      const r = rankOf(mine.value, values, true);
      const score = rankScore(r.rank, r.of);
      if (score < RARITY_FLOOR) continue;
      out.push({
        group: `player:${mine.playerId}`,
        text: `${nameOf(mine.playerId)}'s ${mine.value} ${what} is the ${ordinal(r.rank)}-most by any player in a game this season.`,
        population: `every player's ${what} in every game this season (${games.length} player-games)`,
        score,
        tone: "good",
      });
    }
  }
  return out;
}

/** Biggest comeback or collapse, by the lowest/highest win probability during the game. */
function winProbabilityStandouts(gameId: string, team: string, season: PbpRow[]): Standout[] {
  interface Swing { gameId: string; team: string; won: boolean; min: number; max: number }
  const byGame = new Map<string, Swing[]>();
  for (const r of season) {
    if (!r.home_wp || r.home_wp === "NA" || !r.home_team || !r.away_team) continue;
    const home = num(r.home_wp);
    const hs = num(r.total_home_score);
    const as = num(r.total_away_score);
    const entry = byGame.get(r.game_id) ?? [
      { gameId: r.game_id, team: r.home_team, won: false, min: 1, max: 0 },
      { gameId: r.game_id, team: r.away_team, won: false, min: 1, max: 0 },
    ];
    entry[0].min = Math.min(entry[0].min, home);
    entry[0].max = Math.max(entry[0].max, home);
    entry[1].min = Math.min(entry[1].min, 1 - home);
    entry[1].max = Math.max(entry[1].max, 1 - home);
    // The last row carries the final score; whichever team leads at the end won.
    entry[0].won = hs > as;
    entry[1].won = as > hs;
    byGame.set(r.game_id, entry);
  }
  const all = [...byGame.values()].flat();
  const mine = all.find((s) => s.gameId === gameId && s.team === team);
  if (!mine) return [];
  const out: Standout[] = [];
  if (mine.won && mine.min <= 0.2) {
    const winners = all.filter((s) => s.won).map((s) => s.min);
    const r = rankOf(mine.min, winners, false);
    const score = rankScore(r.rank, r.of);
    if (score >= RARITY_FLOOR) {
      out.push({
        group: "wp",
        text: `Won after the win probability fell to ${Math.round(mine.min * 100)}% — the ${ordinal(r.rank)}-biggest comeback by any team this season.`,
        population: `the lowest in-game win probability of every winning team this season (${winners.length} games)`,
        score,
        tone: "good",
      });
    }
  } else if (!mine.won && mine.max >= 0.8) {
    const losers = all.filter((s) => !s.won).map((s) => s.max);
    const r = rankOf(mine.max, losers, true);
    const score = rankScore(r.rank, r.of);
    if (score >= RARITY_FLOOR) {
      out.push({
        group: "wp",
        text: `Lost after the win probability reached ${Math.round(mine.max * 100)}% — the ${ordinal(r.rank)}-biggest collapse by any team this season.`,
        population: `the highest in-game win probability of every losing team this season (${losers.length} games)`,
        score,
        tone: "bad",
      });
    }
  }
  return out;
}

// ---------- Results since 1999 (the schedule file) ----------

interface Result {
  gameId: string;
  season: number;
  week: number;
  opponent: string;
  isHome: boolean;
  us: number;
  them: number;
}

function ourResults(games: ScheduleGame[], team: string): Result[] {
  return games
    .filter((g) => g.game_type === "REG" && (g.home_team === team || g.away_team === team))
    .filter((g) => g.home_score !== "" && g.home_score !== "NA")
    .map((g) => {
      const isHome = g.home_team === team;
      return {
        gameId: g.game_id,
        season: num(g.season),
        week: num(g.week),
        opponent: isHome ? g.away_team : g.home_team,
        isHome,
        us: num(isHome ? g.home_score : g.away_score),
        them: num(isHome ? g.away_score : g.home_score),
      };
    })
    .sort((a, b) => a.season - b.season || a.week - b.week);
}

const when = (r: Result) => `Week ${r.week}, ${r.season}`;
const since = (gamesAgo: number) => Math.min(0.99, 0.9 + (gamesAgo - 17) / 400); // a season back = 0.9, ~36 seasons = 0.99
const MIN_GAMES_AGO = 17; // a full season

function historyStandouts(gameId: string, games: ScheduleGame[], team: string): Standout[] {
  const results = ourResults(games, team);
  const idx = results.findIndex((r) => r.gameId === gameId);
  if (idx < 0) return [];
  const mine = results[idx];
  const before = results.slice(0, idx);
  const won = mine.us > mine.them;
  const out: Standout[] = [];
  const first = results[0];
  const pop = `every Patriots regular-season game since ${first.season} (${results.length} games)`;

  // "Most points since …" / "fewest allowed since …" — only when the last
  // time it happened was at least a season ago.
  const lastAtLeast = (pred: (r: Result) => boolean) => {
    for (let i = before.length - 1; i >= 0; i--) if (pred(before[i])) return { r: before[i], gamesAgo: before.length - i };
    return null;
  };
  const sinceText = (hit: { r: Result; gamesAgo: number } | null) =>
    hit ? `since ${when(hit.r)}` : `since at least ${first.season}`;
  const sinceScore = (hit: { r: Result; gamesAgo: number } | null) => since(hit ? hit.gamesAgo : before.length);

  if (before.length >= MIN_GAMES_AGO) {
    const hit = lastAtLeast((r) => r.us >= mine.us);
    if (!hit || hit.gamesAgo >= MIN_GAMES_AGO) {
      out.push({ group: "points", text: `${mine.us} points, the most the Patriots have scored ${sinceText(hit)}.`, population: pop, score: sinceScore(hit), tone: "good" });
    }
    const few = lastAtLeast((r) => r.them <= mine.them);
    if (!few || few.gamesAgo >= MIN_GAMES_AGO) {
      out.push({ group: "allowed", text: `${mine.them} points allowed, the fewest ${sinceText(few)}.`, population: pop, score: sinceScore(few), tone: "good" });
    }
    const margin = mine.us - mine.them;
    if (won) {
      const big = lastAtLeast((r) => r.us - r.them >= margin);
      if (!big || big.gamesAgo >= MIN_GAMES_AGO) {
        out.push({ group: "margin", text: `A ${margin}-point win, the biggest ${sinceText(big)}.`, population: pop, score: sinceScore(big), tone: "good" });
      }
    } else if (margin < 0) {
      const bad = lastAtLeast((r) => r.us - r.them <= margin);
      if (!bad || bad.gamesAgo >= MIN_GAMES_AGO) {
        out.push({ group: "margin", text: `A ${-margin}-point loss, the worst ${sinceText(bad)}.`, population: pop, score: sinceScore(bad), tone: "bad" });
      }
    }
  }

  // Head-to-head and venue: "first win over BUF since 2023", "first win in
  // Buffalo since 2021". Needs the last one to be at least three seasons back.
  const seasonsAgo = (r: Result) => mine.season - r.season;
  // "First since" has to mean something was lost in between: a team not
  // played for three years doesn't count, so at least one game against
  // them must sit between the last same result and this one.
  const h2h = before.filter((r) => r.opponent === mine.opponent);
  const lastSame = [...h2h].reverse().find((r) => (r.us > r.them) === won && r.us !== r.them);
  const between = (r: Result) => h2h.filter((g) => g.season > r.season || (g.season === r.season && g.week > r.week)).length;
  if (h2h.length > 0 && lastSame && seasonsAgo(lastSame) >= 3 && between(lastSame) >= 1) {
    out.push({
      group: "h2h",
      text: `The first ${won ? "win over" : "loss to"} ${mine.opponent} since ${lastSame.season}.`,
      population: `every Patriots game against ${mine.opponent} since ${first.season} (${h2h.length} games)`,
      score: Math.min(0.99, 0.9 + seasonsAgo(lastSame) / 100),
      tone: won ? "good" : "bad",
    });
  } else if (!mine.isHome && won) {
    const road = h2h.filter((r) => !r.isHome);
    const lastRoadWin = [...road].reverse().find((r) => r.us > r.them);
    const roadBetween = lastRoadWin ? road.filter((g) => g.season > lastRoadWin.season).length : road.length;
    if (road.length > 0 && (!lastRoadWin || seasonsAgo(lastRoadWin) >= 3) && roadBetween >= 1) {
      out.push({
        group: "h2h",
        text: `The first road win at ${mine.opponent} since ${lastRoadWin ? lastRoadWin.season : `at least ${first.season}`}.`,
        population: `every Patriots road game at ${mine.opponent} since ${first.season} (${road.length} games)`,
        score: Math.min(0.99, 0.9 + (lastRoadWin ? seasonsAgo(lastRoadWin) : 30) / 100),
        tone: "good",
      });
    }
  }

  // Streaks: three or more, and longer than anything in the last two seasons.
  let streak = 0;
  for (let i = idx; i >= 0 && (results[i].us > results[i].them) === won && results[i].us !== results[i].them; i--) streak++;
  if (streak >= 3) {
    // The longest same-kind streak that ended in the previous two seasons.
    let longestRecent = 0;
    let run = 0;
    for (let i = 0; i < idx - streak + 1; i++) {
      const r = results[i];
      run = (r.us > r.them) === won && r.us !== r.them ? run + 1 : 0;
      if (r.season >= mine.season - 2) longestRecent = Math.max(longestRecent, run);
    }
    if (streak > longestRecent) {
      out.push({
        group: "streak",
        text: `A ${streak}-game ${won ? "winning" : "losing"} streak, the longest since at least ${mine.season - 2}.`,
        population: `every Patriots regular-season game since ${mine.season - 2}`,
        score: Math.min(0.99, 0.9 + streak / 50),
        tone: won ? "good" : "bad",
      });
    }
  }
  return out;
}

export function buildStandouts(args: {
  gameId: string;
  team: string;
  seasonPbp: PbpRow[];
  games: ScheduleGame[];
  nameOf: (playerId: string) => string;
}): Standout[] {
  const { gameId, team, seasonPbp, games, nameOf } = args;
  const all = [
    ...teamGameStandouts(gameId, team, teamGames(seasonPbp)),
    ...playerStandouts(gameId, team, seasonPbp, nameOf),
    ...winProbabilityStandouts(gameId, team, seasonPbp),
    ...historyStandouts(gameId, games, team),
  ];
  // One per group, best first, at most three.
  const byGroup = new Map<string, Standout>();
  for (const s of all) {
    const cur = byGroup.get(s.group);
    if (!cur || s.score > cur.score) byGroup.set(s.group, s);
  }
  return [...byGroup.values()].sort((a, b) => b.score - a.score).slice(0, MAX_STANDOUTS);
}
