// Cross-file consistency checks over whatever is currently in
// data/generated/ — run standalone (npm run verify:data) or at the end of
// a full rebuild (scripts/build-all.ts).
//
// These assert invariants that hold by construction when every build
// script runs off the same data/raw/ snapshot, and are silently false
// when they don't. That exact skew shipped to production once: Home
// showed NE's offense 20th (-0.057) while Around the League showed 7th
// (+0.231), because league-epa-rankings.json had been regenerated four
// hours earlier than team-stats.json against older play-by-play.
//
// Kept separate from build-all.ts so it can validate committed state
// without rebuilding it — a rebuild would paper over exactly the
// corruption this is meant to detect.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv } from "./lib/csv";
import type { GamePlays, GameRecap, LeaderPlays, SplitPlays, TeamLeaderboards } from "../lib/data/types";

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const GENERATED = GENERATED_DIR;

async function readGenerated<T>(filename: string): Promise<T> {
  return JSON.parse(await readFile(path.join(GENERATED_DIR, filename), "utf-8")) as T;
}

interface TeamStats {
  epaPerPlay: {
    offense: { value: number; leagueRank: number };
    defense: { value: number; leagueRank: number };
  };
}
interface LeagueEpaRow {
  team: string;
  offenseEpa: number;
  offenseRank: number;
  defenseEpa: number;
  defenseRank: number;
}
interface PositionCard {
  group: string;
  grade: number;
}
interface PositionLeagueTeam {
  team: string;
  groups: Array<{ group: string; grade: number }>;
}

const TEAM = "NE";

export async function verifyData(): Promise<string[]> {
  const failures: string[] = [];

  // 1. team-stats.json and league-epa-rankings.json both come from
  //    computeAdjustedEpa over the same rows — they must agree exactly,
  //    not approximately.
  const teamStats = await readGenerated<TeamStats>("team-stats.json");
  const league = await readGenerated<LeagueEpaRow[]>("league-epa-rankings.json");
  const ne = league.find((r) => r.team === TEAM);

  if (!ne) {
    failures.push("league-epa-rankings.json has no NE row");
  } else {
    const valueChecks: Array<[string, number, number]> = [
      ["offense EPA", teamStats.epaPerPlay.offense.value, ne.offenseEpa],
      ["defense EPA", teamStats.epaPerPlay.defense.value, ne.defenseEpa],
    ];
    for (const [label, a, b] of valueChecks) {
      if (Math.abs(a - b) > 1e-9) {
        failures.push(
          `${label}: team-stats.json says ${a.toFixed(4)}, league-epa-rankings.json says ${b.toFixed(4)} — one file is stale`
        );
      }
    }
    const rankChecks: Array<[string, number, number]> = [
      ["offense rank", teamStats.epaPerPlay.offense.leagueRank, ne.offenseRank],
      ["defense rank", teamStats.epaPerPlay.defense.leagueRank, ne.defenseRank],
    ];
    for (const [label, a, b] of rankChecks) {
      if (a !== b) {
        failures.push(`${label}: team-stats.json says ${a}, league-epa-rankings.json says ${b} — one file is stale`);
      }
    }
  }

  // 2. The featured team's position-group card grades must match its row
  //    in the league-wide table those same grades are ranked within.
  const cards = await readGenerated<PositionCard[]>("position-group-cards.json");
  const posLeague = await readGenerated<PositionLeagueTeam[]>("position-group-league-table.json");
  const neGroups = posLeague.find((t) => t.team === TEAM);
  if (!neGroups) {
    failures.push("position-group-league-table.json has no NE row");
  } else {
    for (const card of cards) {
      const row = neGroups.groups.find((g) => g.group === card.group);
      if (!row) continue;
      if (row.grade !== card.grade) {
        failures.push(
          `${card.group} grade: position-group-cards.json says ${card.grade}, position-group-league-table.json says ${row.grade} — one file is stale`
        );
      }
    }
  }

  // 3. Nothing fabricated should reach the site. LB had no real metric
  //    behind it and used to be merged in from fixtures with an invented
  //    grade and an invented claim about the defense.
  if (cards.some((c) => c.group === "LB")) {
    failures.push("position-group-cards.json contains an LB card — no real metric backs it");
  }

  failures.push(...(await checkAgainstOfficialStats()));
  failures.push(...(await checkPlayLists()));

  return failures;
}

// The Splits tab's lists against its numbers (season to date).
async function checkSplitPlays(): Promise<string[]> {
  const failures: string[] = [];
  const sp = await readGenerated<SplitPlays>("split-plays.json").catch(() => null);
  if (!sp) return ["split-plays.json is missing"];
  const t = await readGenerated<{
    redZonePct: { offense: { value: number }; defense: { value: number } };
    thirdDownPct: { offense: { value: number }; defense: { value: number } };
    twoMinuteDrillEpa: { offense: { value: number }; defense: { value: number } };
    specialTeams: { fieldGoalPct: { value: number } };
    discipline: { penaltiesCommitted: { value: number }; penaltyYardsCommitted: { value: number } };
  }>("team-stats.json");
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const L = sp.lists;
  for (const [side, prefix, value] of [
    ["offense", "New England", t.redZonePct.offense.value],
    ["defense", "Opponent", t.redZonePct.defense.value],
  ] as const) {
    const trips = L.redZone.filter((g) => g.heading.startsWith(prefix));
    const rate = trips.length === 0 ? 0 : trips.filter((g) => g.heading.endsWith("· Touchdown")).length / trips.length;
    if (!near(rate, value)) failures.push(`split plays: ${side} red zone lists ${(rate * 100).toFixed(1)}%, Splits says ${(value * 100).toFixed(1)}%`);
  }
  L.thirdDown.forEach((g, i) => {
    const value = i === 0 ? t.thirdDownPct.offense.value : t.thirdDownPct.defense.value;
    const rate = g.entries.length === 0 ? 0 : g.entries.filter((e) => e.badge === "Converted").length / g.entries.length;
    if (!near(rate, value)) failures.push(`split plays: third downs (${i === 0 ? "offense" : "defense"}) list ${(rate * 100).toFixed(1)}%, Splits says ${(value * 100).toFixed(1)}%`);
  });
  L.twoMinute.forEach((g, i) => {
    // The Splits number is each side's EPA from the offense's view;
    // records carry New England's view, so the defensive side flips.
    const sign = i === 0 ? 1 : -1;
    const value = i === 0 ? t.twoMinuteDrillEpa.offense.value : t.twoMinuteDrillEpa.defense.value;
    const mean = g.entries.length === 0 ? 0 : g.entries.reduce((s, e) => s + sign * (sp.plays[e.key]?.neEpa ?? 0), 0) / g.entries.length;
    if (!near(mean, value)) failures.push(`split plays: two-minute ${i === 0 ? "offense" : "defense"} lists ${mean.toFixed(3)} EPA, Splits says ${value.toFixed(3)}`);
  });
  const fg = L.fieldGoals[0]?.entries ?? [];
  const fgRate = fg.length === 0 ? 0 : fg.filter((e) => e.tone === "good").length / fg.length;
  if (!near(fgRate, t.specialTeams.fieldGoalPct.value)) failures.push(`split plays: field goals list ${(fgRate * 100).toFixed(1)}%, Splits says ${(t.specialTeams.fieldGoalPct.value * 100).toFixed(1)}%`);
  const pen = L.penalties[0]?.entries ?? [];
  const penYards = pen.reduce((s, e) => s + Number((e.badge ?? "0").split(" ")[0]), 0);
  if (pen.length !== t.discipline.penaltiesCommitted.value || penYards !== t.discipline.penaltyYardsCommitted.value) {
    failures.push(`split plays: penalties list ${pen.length} for ${penYards} yds, Splits says ${t.discipline.penaltiesCommitted.value} for ${t.discipline.penaltyYardsCommitted.value}`);
  }
  for (const groups of Object.values(L)) for (const g of groups) for (const e of g.entries) {
    if (!sp.plays[e.key]) failures.push(`split plays: ${e.key} has no play record`);
  }
  return failures;
}

// "See the plays": every list must match the number on the card it opens
// from — the whole promise of the feature. They're built from the same
// selectors, so this should never fire; it's here so a future change to
// one side can't quietly break that.
async function checkPlayLists(): Promise<string[]> {
  const failures: string[] = [];
  const index = (await readGenerated<string[]>("recap-index.json").catch(() => [])) as string[];
  for (const gameId of index) {
    const recap = await readGenerated<GameRecap>(`recap-${gameId}.json`);
    const gp = await readGenerated<GamePlays>(`plays-${gameId}.json`).catch(() => null);
    if (!gp) {
      failures.push(`${gameId}: no plays file for its recap`);
      continue;
    }
    const where = `${gameId} plays`;
    for (const [name, groups] of Object.entries(gp.lists)) {
      for (const g of groups) for (const e of g.entries) {
        if (!gp.plays[e.key]) failures.push(`${where}: ${name} lists ${e.key}, which has no play record`);
      }
    }
    const [off3, def3] = gp.lists.thirdDown;
    const conv = (g: { entries: Array<{ badge?: string }> }) => g.entries.filter((e) => e.badge === "Converted").length;
    if (off3.entries.length !== recap.thirdDown.offense.att || conv(off3) !== recap.thirdDown.offense.conv) {
      failures.push(`${where}: third downs list ${conv(off3)}/${off3.entries.length}, card says ${recap.thirdDown.offense.conv}/${recap.thirdDown.offense.att}`);
    }
    if (def3.entries.length !== recap.thirdDown.defense.att || conv(def3) !== recap.thirdDown.defense.conv) {
      failures.push(`${where}: opponent third downs list ${conv(def3)}/${def3.entries.length}, card says ${recap.thirdDown.defense.conv}/${recap.thirdDown.defense.att}`);
    }
    const trips = (who: "New England" | "other") =>
      gp.lists.redZone.filter((g) => (who === "New England") === g.heading.startsWith("New England"));
    for (const [who, card] of [["New England", recap.redZone.offense], ["other", recap.redZone.defense]] as const) {
      const t = trips(who);
      const tds = t.filter((g) => g.heading.endsWith("· Touchdown")).length;
      if (t.length !== card.att || tds !== card.td) {
        failures.push(`${where}: ${who} red-zone trips list ${tds}/${t.length}, card says ${card.td}/${card.att}`);
      }
    }
    const [giveaways, takeaways] = gp.lists.turnovers;
    if (takeaways.entries.length - giveaways.entries.length !== recap.turnoverMargin) {
      failures.push(`${where}: turnovers list ${takeaways.entries.length} takeaways − ${giveaways.entries.length} giveaways, card says ${recap.turnoverMargin}`);
    }
    const [explFor, explAgainst] = gp.lists.explosive;
    for (const [label, list, n, rate] of [
      ["explosive for", explFor, gp.scrimmagePlays.offense, recap.explosivePlayRate.for],
      ["explosive against", explAgainst, gp.scrimmagePlays.defense, recap.explosivePlayRate.against],
    ] as const) {
      if (n > 0 && Math.abs(list.entries.length / n - rate) > 1e-9) {
        failures.push(`${where}: ${label} lists ${list.entries.length} of ${n} plays, card says ${(rate * 100).toFixed(1)}%`);
      }
    }
    const star = gp.lists.star[0];
    if (star) {
      const sum = star.entries.reduce((s, e) => s + Number((e.badge ?? "0").replace(/[^-\d.]/g, "")), 0) / 100;
      // Badges are rounded to 0.1%, so allow that much per play.
      if (Math.abs(sum - recap.playerOfTheGame.wpa) > 0.0005 * star.entries.length + 1e-9) {
        failures.push(`${where}: player of the game's plays add to ${(sum * 100).toFixed(1)}%, card says ${(recap.playerOfTheGame.wpa * 100).toFixed(1)}%`);
      }
    }
  }

  failures.push(...(await checkSplitPlays()));

  const lp = await readGenerated<LeaderPlays>("leader-plays.json").catch(() => null);
  const boards = await readGenerated<TeamLeaderboards>("leaderboards.json");
  if (!lp) return [...failures, "leader-plays.json is missing"];
  const stat = (line: { stats: Array<{ label: string; value: string }> }, label: string) =>
    line.stats.find((s) => s.label === label)?.value ?? "";
  for (const line of boards.receiving) {
    const g = lp.byPlayer[`receiving:${line.playerId}`];
    const [rec, targets] = stat(line, "Rec").split("/").map(Number);
    const catches = g?.entries.filter((e) => e.tone === "good").length ?? -1;
    if (!g || g.entries.length !== targets || catches !== rec) {
      failures.push(`leader plays: ${line.playerName} lists ${catches}/${g?.entries.length ?? 0}, board says ${rec}/${targets}`);
    }
  }
  for (const line of boards.rushing) {
    const g = lp.byPlayer[`rushing:${line.playerId}`];
    if (!g || g.entries.length !== Number(stat(line, "Att"))) {
      failures.push(`leader plays: ${line.playerName} lists ${g?.entries.length ?? 0} carries, board says ${stat(line, "Att")}`);
    }
  }
  for (const line of boards.defense) {
    const g = lp.byPlayer[`defense:${line.playerId}`];
    const count = (tag: string) => g?.entries.filter((e) => (e.badge ?? "").split(" · ").includes(tag)).length ?? 0;
    const listed: Record<string, number> = {
      Sacks: count("Sack") + count("½ sack") / 2,
      "QB Hits": count("QB hit"),
      TFL: count("TFL"),
      INT: count("INT"),
      PBU: count("PBU"),
      FF: count("FF"),
    };
    for (const [label, n] of Object.entries(listed)) {
      if (Math.abs(n - Number(stat(line, label))) > 1e-9) {
        failures.push(`leader plays: ${line.playerName} ${label} lists ${n}, board says ${stat(line, label)}`);
      }
    }
  }
  return failures;
}

// Cross-checks our own play-by-play aggregation against nflverse's
// canonical per-player season totals.
//
// This exists because three real bugs shipped that no internal
// consistency check could have caught — our numbers agreed with
// themselves perfectly, they just didn't match football. A fumble on a
// reception was attributed to nobody, fumbles that stayed in the
// offense's hands weren't counted, and every QB scramble in the league
// was dropped because nflverse leaves rusher_id blank on those rows.
// Each was found by a reader noticing a number was wrong, which is the
// worst possible way to find it.
//
// Comparing against an independently-produced aggregation of the same
// underlying games is the check that catches this whole class at once.
async function checkAgainstOfficialStats(): Promise<string[]> {
  const failures: string[] = [];
  const boards = JSON.parse(
    await readFile(path.join(GENERATED, "leaderboards.json"), "utf8")
  ) as TeamLeaderboards;
  const siteShowsStats = boards.rushing.length + boards.receiving.length + boards.defense.length > 0;

  let allOfficial: Array<Record<string, string>>;
  try {
    allOfficial = await loadCsv<Record<string, string>>("stats_player_reg_2026.csv");
  } catch {
    // This used to return quietly, so a fresh clone printed "verified"
    // having compared nothing against nflverse. Only pass when there's
    // genuinely nothing on the site to check yet (before Week 1).
    if (siteShowsStats) {
      failures.push(
        "data/raw/stats_player_reg_2026.csv is missing, so nothing was checked against nflverse — run `npx tsx scripts/fetch-nflverse.ts` first"
      );
    }
    return failures;
  }
  const official = allOfficial.filter((r) => r.recent_team === TEAM);
  if (official.length === 0) {
    if (siteShowsStats) failures.push(`nflverse's player stats have no ${TEAM} rows, but the site shows ${TEAM} stats`);
    return failures;
  }

  const byId = new Map(official.map((r) => [r.player_id, r]));
  const n = (v: string | undefined) => (!v || v === "NA" ? 0 : Number(v));
  const statOf = (line: { stats: Array<{ label: string; value: string }> }, label: string) =>
    Number(line.stats.find((s) => s.label === label)?.value ?? NaN);

  for (const line of boards.rushing) {
    const o = byId.get(line.playerId);
    if (!o) continue;
    const expect: Array<[string, number, number]> = [
      ["carries", statOf(line, "Att"), n(o.carries)],
      ["rushing yards", statOf(line, "Yds"), n(o.rushing_yards)],
      ["rushing TDs", statOf(line, "TD"), n(o.rushing_tds)],
    ];
    for (const [what, ours, theirs] of expect) {
      if (Number.isFinite(ours) && Math.abs(ours - theirs) > 0.5) {
        failures.push(`${line.playerName} ${what}: site ${ours}, nflverse ${theirs}`);
      }
    }
  }

  for (const line of boards.receiving) {
    const o = byId.get(line.playerId);
    if (!o) continue;
    const rec = String(line.stats.find((s) => s.label === "Rec")?.value ?? "");
    const [caught, targeted] = rec.split("/").map(Number);
    const expect: Array<[string, number, number]> = [
      ["receptions", caught, n(o.receptions)],
      ["targets", targeted, n(o.targets)],
      ["receiving yards", statOf(line, "Yds"), n(o.receiving_yards)],
      ["receiving TDs", statOf(line, "TD"), n(o.receiving_tds)],
    ];
    for (const [what, ours, theirs] of expect) {
      if (Number.isFinite(ours) && Math.abs(ours - theirs) > 0.5) {
        failures.push(`${line.playerName} ${what}: site ${ours}, nflverse ${theirs}`);
      }
    }
  }

  // Fumbles are shown on the board for the play they happened on, so
  // each board is checked against its own nflverse column. Summing them
  // would hide exactly the bug this was written for: a fumble on a
  // reception appearing against a player's rushing line.
  for (const [board, column, label] of [
    [boards.rushing, "rushing_fumbles", "rushing fumbles"],
    [boards.receiving, "receiving_fumbles", "receiving fumbles"],
  ] as Array<[typeof boards.rushing, string, string]>) {
    for (const line of board) {
      const o = byId.get(line.playerId);
      if (!o) continue;
      const ours = statOf(line, "FUM");
      const theirs = n(o[column]);
      if (Number.isFinite(ours) && Math.abs(ours - theirs) > 0.5) {
        failures.push(`${line.playerName} ${label}: site ${ours}, nflverse ${theirs}`);
      }
    }
  }

  // Defense board. Half-sacks are real, so the tolerance is tight.
  const defenseColumns: Array<[string, string]> = [
    ["Sacks", "def_sacks"],
    ["QB Hits", "def_qb_hits"],
    ["TFL", "def_tackles_for_loss"],
    ["INT", "def_interceptions"],
    ["PBU", "def_pass_defended"],
    ["FF", "def_fumbles_forced"],
  ];
  for (const line of boards.defense) {
    const o = byId.get(line.playerId);
    if (!o) continue;
    for (const [label, column] of defenseColumns) {
      const ours = statOf(line, label);
      const theirs = n(o[column]);
      if (Number.isFinite(ours) && Math.abs(ours - theirs) > 0.01) {
        failures.push(`${line.playerName} ${label}: site ${ours}, nflverse ${theirs}`);
      }
    }
  }

  failures.push(...(await checkPassingLines(allOfficial)));

  // Kicking: the Splits tab's field-goal percentage against nflverse's
  // own made/attempted totals for our kickers.
  const kickers = official.filter((r) => n(r.fg_att) > 0);
  if (kickers.length > 0) {
    const made = kickers.reduce((s, r) => s + n(r.fg_made), 0);
    const att = kickers.reduce((s, r) => s + n(r.fg_att), 0);
    const ours = (await readGenerated<{ specialTeams: { fieldGoalPct: { value: number } } }>("team-stats.json"))
      .specialTeams.fieldGoalPct.value;
    if (Math.abs(ours - made / att) > 1e-9) {
      failures.push(`field goal %: site ${(ours * 100).toFixed(1)}%, nflverse ${made}/${att} (${((made / att) * 100).toFixed(1)}%)`);
    }
  }
  failures.push(...(await checkPriorSeasonQb()));
  failures.push(...(await checkAgainstNextGenStats()));

  return failures;
}

// A second, independently-produced source for passing totals: NFL Next
// Gen Stats' season rows carry completions, attempts, yards, TDs and INTs
// for every qualified QB. Two outside sources agreeing with the site is a
// much stronger check than one.
async function checkAgainstNextGenStats(): Promise<string[]> {
  let rows: Array<Record<string, string>>;
  try {
    rows = (await loadCsv<Record<string, string>>("ngs_passing.csv")).filter(
      (r) => r.season === "2026" && r.season_type === "REG" && r.week === "0"
    );
  } catch {
    return ["data/raw/ngs_passing.csv is missing, so passing wasn't cross-checked against Next Gen Stats — run `npx tsx scripts/fetch-nflverse.ts`"];
  }
  const league = await readGenerated<
    Array<{ playerId: string; playerName: string; team: string; completions: number; attempts: number; yards: number; tds: number; ints: number }>
  >("qb-league-table.json");
  const byId = new Map(rows.map((r) => [r.player_gsis_id, r]));
  const failures: string[] = [];
  for (const qb of league) {
    const o = byId.get(qb.playerId);
    if (!o || o.team_abbr !== qb.team) continue;
    const expect: Array<[string, number, number]> = [
      ["completions", qb.completions, Number(o.completions)],
      ["pass attempts", qb.attempts, Number(o.attempts)],
      ["passing yards", qb.yards, Number(o.pass_yards)],
      ["passing TDs", qb.tds, Number(o.pass_touchdowns)],
      ["interceptions", qb.ints, Number(o.interceptions)],
    ];
    for (const [what, ours, theirs] of expect) {
      if (Math.abs(ours - theirs) > 0.5) {
        failures.push(`${qb.playerName} (${qb.team}) ${what}: site ${ours}, Next Gen Stats ${theirs}`);
      }
    }
  }
  return failures;
}

// The frozen "2025 Season" snapshot is built once and never rebuilt, so
// nothing else would ever notice if it were wrong — and it was: it folded
// in the playoffs, showing Maye at 5,222 yards for a 4,394-yard season.
async function checkPriorSeasonQb(): Promise<string[]> {
  interface PriorQb {
    playerName: string;
    completions: number;
    attempts: number;
    yards: number;
    tds: number;
    ints: number;
  }
  const snapshot = await readGenerated<{ season: number; team: string; qb: PriorQb }>(
    "prior-season-2025.json"
  ).catch(() => null);
  if (!snapshot) return [];

  let rows: Array<Record<string, string>>;
  try {
    rows = await loadCsv<Record<string, string>>(`stats_player_reg_${snapshot.season}.csv`);
  } catch {
    return [
      `data/raw/stats_player_reg_${snapshot.season}.csv is missing, so the ${snapshot.season} snapshot wasn't checked — run \`npx tsx scripts/fetch-nflverse.ts\``,
    ];
  }
  const qb = snapshot.qb;
  const o = rows.find((r) => r.player_display_name === qb.playerName && r.recent_team === snapshot.team);
  if (!o) return [`${snapshot.season} snapshot QB ${qb.playerName} not found in nflverse's ${snapshot.team} stats`];

  const n = (v: string | undefined) => (!v || v === "NA" ? 0 : Number(v));
  const failures: string[] = [];
  const expect: Array<[string, number, number]> = [
    ["completions", qb.completions, n(o.completions)],
    ["pass attempts", qb.attempts, n(o.attempts)],
    ["passing yards", qb.yards, n(o.passing_yards)],
    ["passing TDs", qb.tds, n(o.passing_tds)],
    ["interceptions", qb.ints, n(o.passing_interceptions)],
  ];
  for (const [what, ours, theirs] of expect) {
    if (Math.abs(ours - theirs) > 0.5) {
      failures.push(`${snapshot.season} ${qb.playerName} ${what}: site ${ours}, nflverse ${theirs}`);
    }
  }
  return failures;
}

// Passing box scores — the gap that let a wrong QB line ship: nflverse
// marks sacks as pass attempts, the site counted them, and Drake Maye
// read 51/89 for 547 yds when the real line was 51/80 for 585. Checked
// for our QB and for every team's starter in the league table, since the
// head-to-head tool shows any of them.
async function checkPassingLines(allOfficial: Array<Record<string, string>>): Promise<string[]> {
  const failures: string[] = [];
  const byId = new Map(allOfficial.map((r) => [r.player_id, r]));
  const n = (v: string | undefined) => (!v || v === "NA" ? 0 : Number(v));

  interface QbLine {
    playerId: string;
    playerName: string;
    team: string;
    completions: number;
    attempts: number;
    yards: number;
    tds: number;
    ints: number;
  }
  const featured = await readGenerated<QbLine>("qb-deep-dive.json");
  const league = await readGenerated<QbLine[]>("qb-league-table.json");

  const qbs = new Map([featured, ...league].map((qb) => [`${qb.team}|${qb.playerId}`, qb]));
  for (const qb of qbs.values()) {
    const o = byId.get(qb.playerId);
    // nflverse's season row is the player's whole season; ours is his
    // games for this team. A traded QB would differ legitimately.
    if (!o || o.recent_team !== qb.team) continue;
    const expect: Array<[string, number, number]> = [
      ["completions", qb.completions, n(o.completions)],
      ["pass attempts", qb.attempts, n(o.attempts)],
      ["passing yards", qb.yards, n(o.passing_yards)],
      ["passing TDs", qb.tds, n(o.passing_tds)],
      ["interceptions", qb.ints, n(o.passing_interceptions)],
    ];
    for (const [what, ours, theirs] of expect) {
      if (Math.abs(ours - theirs) > 0.5) {
        failures.push(`${qb.playerName} (${qb.team}) ${what}: site ${ours}, nflverse ${theirs}`);
      }
    }
  }
  return failures;
}

async function main() {
  const failures = await verifyData();
  if (failures.length > 0) {
    console.error("✖ Data consistency check FAILED:");
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }
  console.log("✓ Data consistency verified.");
}

// Only run as a CLI when invoked directly, so build-all.ts can import
// verifyData() without triggering a second process.exit path.
if (process.argv[1]?.endsWith("verify-data.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
