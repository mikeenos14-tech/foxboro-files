// Builds real depth chart, position-group report cards (offensive skill
// positions only — see note below), and a QB deep dive from nflverse's
// roster file + play-by-play. Run with: npx tsx scripts/build-roster-data.ts
// (after: npx tsx scripts/fetch-nflverse.ts)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num, bool01 } from "./lib/csv";
import {
  playTypeEpa,
  olFaultSackRateAllowed,
  pressureRateAllowed,
  sackRateGenerated,
  type PbpRow,
} from "./lib/pbp";
import { loadQbFaultSackKeys } from "./lib/ftn";
import { computeDefensivePlayerStats, defensiveGroupStatLine } from "./lib/defensiveStats";
import {
  loadTeamRoster,
  buildLeagueRosterByGsis,
  type RosterRow,
} from "./lib/roster";
import { rankGeneric } from "./lib/rank";
import { ALL_TEAMS } from "./lib/teams";
import { buildLastNGameWindows, filterRowsToWindow } from "./lib/statWindows";
import { ordinal } from "../lib/calc/ranks";
import type {
  DepthChartEntry,
  PositionGroupReportCard,
  PositionGroupLeagueTeamEntry,
  QBDeepDive,
  QBWindowStats,
} from "../lib/data/types";

const TEAM = "NE";
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

async function buildDepthChart(): Promise<DepthChartEntry[]> {
  const roster = await loadTeamRoster(TEAM);
  const byPosition = new Map<string, RosterRow[]>();
  for (const r of roster) {
    const pos = r.depth_chart_position || r.position || "N/A";
    if (!byPosition.has(pos)) byPosition.set(pos, []);
    byPosition.get(pos)!.push(r);
  }

  // File order approximates depth order but isn't an authoritative starter
  // ranking — nflverse doesn't publish one. Good enough for "who's on this
  // roster at this position," not a claim about the actual 1/2/3 order.
  return [...byPosition.entries()].map(([position, players]) => ({
    position,
    players: players.map((p, i) => ({
      playerId: p.gsis_id,
      playerName: p.full_name,
      headshotUrl: p.headshot_url || undefined,
      rank: i + 1,
    })),
  }));
}

// ---------- Position-group report cards ----------
// QB/RB/WR/TE: per-play EPA cleanly attributed to one player via
// passer_id/rusher_id/receiver_id.
// OL/Edge/Interior DL/Secondary: no PFF-style pass-block-win-rate or
// coverage-grade data is available for free, so these use the closest
// honest team-unit proxy instead of a fabricated player-level grade —
// pass protection (sack rate allowed, narrowed to sacks FTN's real
// charting data didn't flag as the QB's own fault — see lib/ftn.ts),
// pass rush (sack rate generated), run defense (rush EPA allowed), and
// pass defense (pass EPA allowed) respectively. Each says so explicitly
// in its "so what" text.
// LB is left as the one illustrative placeholder (merged in by
// lib/data/store.ts) — linebacker play spans both run support and
// coverage without a clean, non-redundant team-level metric to isolate it.

function positionEpa(
  pbp: PbpRow[],
  rosterByGsis: Map<string, RosterRow>,
  team: string,
  position: string,
  idField: "passer_id" | "rusher_id" | "receiver_id",
  playType: "pass" | "run"
): { epa: number; n: number } {
  const rows = pbp.filter((r) => {
    if (r.posteam !== team || r.play_type !== playType) return false;
    const pid = r[idField];
    if (!pid) return false;
    return rosterByGsis.get(pid)?.position === position;
  });
  if (rows.length === 0) return { epa: 0, n: 0 };
  return {
    epa: rows.reduce((sum, r) => sum + num(r.epa), 0) / rows.length,
    n: rows.length,
  };
}

// Real traditional rushing counting stats for a team's RB group —
// EPA/play (above) says how valuable the production was; this says what
// it actually was in box-score terms. "Explosive" here matches the
// site's other 10+-yard explosive-play convention (see pbp.ts).
function rushingStatLine(pbp: PbpRow[], rosterByGsis: Map<string, RosterRow>, team: string): string {
  const rows = pbp.filter(
    (r) => r.posteam === team && r.play_type === "run" && r.rusher_id && rosterByGsis.get(r.rusher_id)?.position === "RB"
  );
  if (rows.length === 0) return "";
  const yards = rows.reduce((sum, r) => sum + num(r.yards_gained), 0);
  const ypc = yards / rows.length;
  const tds = rows.filter((r) => bool01(r.rush_touchdown)).length;
  const fumbles = rows.filter((r) => bool01(r.fumble_lost)).length;
  const explosiveRate = rows.filter((r) => num(r.yards_gained) >= 10).length / rows.length;
  return `${yards} yds, ${ypc.toFixed(1)} YPC, ${tds} TD, ${fumbles} FUM, ${(explosiveRate * 100).toFixed(0)}% explosive`;
}

// Real traditional receiving counting stats for a WR/TE group —
// receptions/targets, catch rate, yards, yards after catch (a real
// signal EPA doesn't isolate: two players at the same EPA/play can get
// there very differently, contested possession-catches vs. YAC threats),
// and TDs.
function receivingStatLine(
  pbp: PbpRow[],
  rosterByGsis: Map<string, RosterRow>,
  team: string,
  position: "WR" | "TE"
): string {
  const targets = pbp.filter(
    (r) =>
      r.posteam === team &&
      bool01(r.pass_attempt) &&
      r.receiver_id &&
      rosterByGsis.get(r.receiver_id)?.position === position
  );
  if (targets.length === 0) return "";
  const receptions = targets.filter((r) => bool01(r.complete_pass));
  const catchRate = receptions.length / targets.length;
  const yards = receptions.reduce((sum, r) => sum + num(r.yards_gained), 0);
  const yacRows = receptions.filter((r) => r.yards_after_catch !== "" && r.yards_after_catch !== "NA");
  const yac = yacRows.length === 0 ? 0 : yacRows.reduce((sum, r) => sum + num(r.yards_after_catch), 0) / yacRows.length;
  const tds = receptions.filter((r) => bool01(r.pass_touchdown)).length;
  return `${receptions.length}/${targets.length} (${(catchRate * 100).toFixed(0)}%), ${yards} yds, ${yac.toFixed(1)} YAC/rec, ${tds} TD`;
}

// Every group here is a raw (not opponent-adjusted) team-wide proxy
// stat — see the note above buildPositionGroupCards — so, unlike Team
// Strength's opponent-adjusted EPA, windowing doesn't need every team's
// window aligned to the same calendar weeks; each team's own "last N
// games I've played" is a perfectly fine, self-contained input. A team
// that hasn't played N games yet (bye, or fewer games so far than the
// window being requested) clamps to the most games they do have, same
// early-season fallback used everywhere else on the site.
function windowedRowsByTeamAndIndex(
  pbp: PbpRow[],
  teams: string[]
): (team: string, index: number) => PbpRow[] {
  const windowsByTeam = new Map(teams.map((t) => [t, buildLastNGameWindows(pbp, t)]));
  return (team: string, index: number): PbpRow[] => {
    const windows = windowsByTeam.get(team) ?? [];
    if (windows.length === 0) return [];
    return filterRowsToWindow(pbp, windows[Math.min(index, windows.length - 1)]);
  };
}

// Shared by buildPositionGroupCards (TEAM's own card, windowed) and
// buildPositionGroupLeagueTable (all 32 teams' grades, for head-to-head
// comparison) so the group definitions can't drift between the two.
const PLAYER_ATTRIBUTED_GROUPS: Array<{
  label: string;
  idField: "passer_id" | "rusher_id" | "receiver_id";
  playType: "pass" | "run";
  rosterPosition: string;
}> = [
  { label: "QB", idField: "passer_id", playType: "pass", rosterPosition: "QB" },
  { label: "RB", idField: "rusher_id", playType: "run", rosterPosition: "RB" },
  { label: "WR", idField: "receiver_id", playType: "pass", rosterPosition: "WR" },
  { label: "TE", idField: "receiver_id", playType: "pass", rosterPosition: "TE" },
];

async function buildPositionGroupCards(
  pbp: PbpRow[]
): Promise<PositionGroupReportCard[]> {
  const rosterByGsis = await buildLeagueRosterByGsis();
  const qbFaultSackKeys = await loadQbFaultSackKeys();
  const rowsFor = windowedRowsByTeamAndIndex(pbp, ALL_TEAMS);
  const windowLabels = buildLastNGameWindows(pbp, TEAM).map((w) => ({ key: w.key, label: w.label }));
  const groups = PLAYER_ATTRIBUTED_GROUPS;

  const windowedGrade = (
    valueOf: (rows: PbpRow[], t: string) => number,
    higherIsBetter: boolean
  ): Array<{ key: string; label: string; grade: number }> =>
    windowLabels.map(({ key, label }, i) => ({
      key,
      label,
      grade: rankGeneric(ALL_TEAMS, TEAM, (t) => valueOf(rowsFor(t, i), t), higherIsBetter)
        .leaguePercentile,
    }));

  // Averages two independent percentile ranks into one grade — used for
  // OL, where sack rate alone is too late/low-sample a signal on its own
  // (see pressureRateAllowed in pbp.ts): each metric is ranked across the
  // league on its own terms, then the two percentiles are blended 50/50.
  const blendedGrade = (
    valueOfA: (rows: PbpRow[], t: string) => number,
    higherIsBetterA: boolean,
    valueOfB: (rows: PbpRow[], t: string) => number,
    higherIsBetterB: boolean
  ): number => {
    const a = rankGeneric(ALL_TEAMS, TEAM, (t) => valueOfA(pbp, t), higherIsBetterA).leaguePercentile;
    const b = rankGeneric(ALL_TEAMS, TEAM, (t) => valueOfB(pbp, t), higherIsBetterB).leaguePercentile;
    return Math.round((a + b) / 2);
  };

  const blendedWindowedGrade = (
    valueOfA: (rows: PbpRow[], t: string) => number,
    higherIsBetterA: boolean,
    valueOfB: (rows: PbpRow[], t: string) => number,
    higherIsBetterB: boolean
  ): Array<{ key: string; label: string; grade: number }> =>
    windowLabels.map(({ key, label }, i) => {
      const a = rankGeneric(ALL_TEAMS, TEAM, (t) => valueOfA(rowsFor(t, i), t), higherIsBetterA)
        .leaguePercentile;
      const b = rankGeneric(ALL_TEAMS, TEAM, (t) => valueOfB(rowsFor(t, i), t), higherIsBetterB)
        .leaguePercentile;
      return { key, label, grade: Math.round((a + b) / 2) };
    });

  const playerAttributed = groups.map(({ label, idField, playType, rosterPosition }) => {
    const valueOf = (t: string) =>
      positionEpa(pbp, rosterByGsis, t, rosterPosition, idField, playType).epa;
    const ranked = rankGeneric(ALL_TEAMS, TEAM, valueOf, true);
    // Percentile doubles as a 0-100 "grade" by construction (50 = league
    // average) — that's the whole "vs. league" story, so the card shows
    // this number directly rather than a separate always-50 comparison.
    const grade = ranked.leaguePercentile;
    const { n } = positionEpa(pbp, rosterByGsis, TEAM, rosterPosition, idField, playType);
    const statLine =
      label === "RB"
        ? rushingStatLine(pbp, rosterByGsis, TEAM)
        : label === "WR" || label === "TE"
          ? receivingStatLine(pbp, rosterByGsis, TEAM, label)
          : "";
    return {
      group: label,
      grade,
      // Only one week of data so far — nothing to trend against yet.
      // Revisit once multiple weeks accumulate.
      trend: "flat" as const,
      soWhat: `${ordinal(grade)} percentile in the NFL for EPA/play generated at ${label} this season (${n} plays sampled).`,
      windows: windowedGrade(
        (rows, t) => positionEpa(rows, rosterByGsis, t, rosterPosition, idField, playType).epa,
        true
      ),
      statLine,
    };
  });

  const unitGrade = (valueOf: (t: string) => number, higherIsBetter: boolean) =>
    rankGeneric(ALL_TEAMS, TEAM, valueOf, higherIsBetter).leaguePercentile;

  // Real per-player counting stats (sacks, QB hits, TFL, forced fumbles,
  // INT, passes defended) straight from nflverse's own player-attribution
  // columns — see lib/defensiveStats.ts. These don't change how any grade
  // above is computed (still the team-wide EPA/rate proxies, which stay
  // the fairest available "vs. league" comparison); they add real texture
  // underneath, the same way rushingStatLine/receivingStatLine do for the
  // offensive skill positions.
  const defPlayerStats = computeDefensivePlayerStats(pbp, TEAM);

  const teamUnits: PositionGroupReportCard[] = [
    (() => {
      // Blends two independent signals so the grade isn't just sack rate:
      // sacks that weren't the QB's own fault (real per-play charting
      // data, see lib/ftn.ts), and pressure rate allowed — sacks OR QB
      // hits, a broader, earlier-triggering signal that catches a beaten
      // block even when a quick throw bails out the sack (see
      // pressureRateAllowed in lib/pbp.ts). Each is ranked across the
      // league on its own terms, then averaged 50/50.
      const sackValue = (rows: PbpRow[], t: string) => olFaultSackRateAllowed(rows, t, qbFaultSackKeys);
      const pressureValue = (rows: PbpRow[], t: string) => pressureRateAllowed(rows, t);
      const grade = blendedGrade(sackValue, false, pressureValue, false);
      const sackGrade = rankGeneric(ALL_TEAMS, TEAM, (t) => sackValue(pbp, t), false).leaguePercentile;
      const pressureGrade = rankGeneric(ALL_TEAMS, TEAM, (t) => pressureValue(pbp, t), false).leaguePercentile;
      return {
        group: "OL",
        grade,
        trend: "flat" as const,
        soWhat: `${ordinal(grade)} percentile in the NFL for pass protection — blends sacks that weren't the QB's own fault (${ordinal(sackGrade)} percentile) with pressure rate allowed, sacks or QB hits combined (${ordinal(pressureGrade)} percentile). Real per-play data, still team-wide — no per-player blocking grade available free.`,
        windows: blendedWindowedGrade(sackValue, false, pressureValue, false),
        // No per-player pass-block data exists free — the OL grade above
        // is the ceiling here.
        statLine: "",
      };
    })(),
    {
      group: "Edge",
      grade: unitGrade((t) => sackRateGenerated(pbp, t), true),
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => sackRateGenerated(pbp, t), true))} percentile in the NFL for sack rate generated (pass rush proxy, team-wide — not isolated to edge rushers specifically).`,
      windows: windowedGrade((rows, t) => sackRateGenerated(rows, t), true),
      statLine: defensiveGroupStatLine(defPlayerStats, rosterByGsis, ["OLB"], "sacks", "sacks", "qbHits", "QB hits"),
    },
    {
      group: "Interior DL",
      grade: unitGrade((t) => playTypeEpa(pbp, t, "defteam", "run"), false),
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => playTypeEpa(pbp, t, "defteam", "run"), false))} percentile in the NFL for rush EPA allowed (run defense proxy, team-wide — not isolated to interior linemen specifically).`,
      windows: windowedGrade((rows, t) => playTypeEpa(rows, t, "defteam", "run"), false),
      statLine: defensiveGroupStatLine(defPlayerStats, rosterByGsis, ["DT", "NT", "DE"], "tfl", "TFL", "sacks", "sacks"),
    },
    {
      group: "Secondary",
      grade: unitGrade((t) => playTypeEpa(pbp, t, "defteam", "pass"), false),
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => playTypeEpa(pbp, t, "defteam", "pass"), false))} percentile in the NFL for pass EPA allowed (pass defense proxy — includes pass rush effect, not isolated to coverage alone).`,
      windows: windowedGrade((rows, t) => playTypeEpa(rows, t, "defteam", "pass"), false),
      statLine: defensiveGroupStatLine(
        defPlayerStats,
        rosterByGsis,
        ["CB", "FS", "SS", "S"],
        "interceptions",
        "INT",
        "passesDefended",
        "PBU"
      ),
    },
  ];

  return [...playerAttributed, ...teamUnits];
}

// Every team's grade in every group, full-season only (no windowing —
// same scope as the QB head-to-head tool this mirrors), for the
// position-group compare tool. rawValue/rawLabel carry the underlying
// metric so the comparison shows a real number, not just a percentile —
// units vary by group (EPA/play for the four skill positions, a rate for
// the rest), which is why each group also gets its own rawLabel rather
// than assuming one shared unit.
async function buildPositionGroupLeagueTable(
  pbp: PbpRow[]
): Promise<PositionGroupLeagueTeamEntry[]> {
  const rosterByGsis = await buildLeagueRosterByGsis();
  const qbFaultSackKeys = await loadQbFaultSackKeys();

  const rankAndValue = (valueOf: (t: string) => number, higherIsBetter: boolean, team: string) => ({
    grade: rankGeneric(ALL_TEAMS, team, valueOf, higherIsBetter).leaguePercentile,
    rawValue: valueOf(team),
  });

  const sackValue = (t: string) => olFaultSackRateAllowed(pbp, t, qbFaultSackKeys);
  const pressureValue = (t: string) => pressureRateAllowed(pbp, t);
  const edgeValue = (t: string) => sackRateGenerated(pbp, t);
  const idlValue = (t: string) => playTypeEpa(pbp, t, "defteam", "run");
  const secValue = (t: string) => playTypeEpa(pbp, t, "defteam", "pass");

  return ALL_TEAMS.map((team) => {
    const playerGroups = PLAYER_ATTRIBUTED_GROUPS.map(({ label, idField, playType, rosterPosition }) => {
      const valueOf = (t: string) => positionEpa(pbp, rosterByGsis, t, rosterPosition, idField, playType).epa;
      return { group: label, rawLabel: "EPA/play", ...rankAndValue(valueOf, true, team) };
    });

    const olSackGrade = rankGeneric(ALL_TEAMS, team, sackValue, false).leaguePercentile;
    const olPressureGrade = rankGeneric(ALL_TEAMS, team, pressureValue, false).leaguePercentile;

    const teamUnitGroups = [
      {
        group: "OL",
        grade: Math.round((olSackGrade + olPressureGrade) / 2),
        rawValue: sackValue(team),
        rawLabel: "Sack rate allowed (excl. QB fault)",
      },
      { group: "Edge", rawLabel: "Sack rate generated", ...rankAndValue(edgeValue, true, team) },
      { group: "Interior DL", rawLabel: "Rush EPA allowed", ...rankAndValue(idlValue, false, team) },
      { group: "Secondary", rawLabel: "Pass EPA allowed", ...rankAndValue(secValue, false, team) },
    ];

    return { team, groups: [...playerGroups, ...teamUnitGroups] };
  });
}

// ---------- QB deep dive ----------

// Pure stat computation given an already-filtered set of one passer's
// pass-attempt rows — shared by the full-season computation below and by
// the per-window ("last N games") computation, which just feeds this a
// smaller row set.
function qbStatsFromRows(rows: PbpRow[]): QBWindowStats {
  const completions = rows.filter((r) => bool01(r.complete_pass));
  const withAirYards = rows.filter((r) => r.air_yards !== "" && r.air_yards !== "NA");

  const depthBucket = (rowsInBucket: PbpRow[]) => {
    if (rowsInBucket.length === 0) return 0;
    return rowsInBucket.filter((r) => bool01(r.complete_pass)).length / rowsInBucket.length;
  };
  const short = withAirYards.filter((r) => num(r.air_yards) >= 0 && num(r.air_yards) <= 9);
  const medium = withAirYards.filter((r) => num(r.air_yards) >= 10 && num(r.air_yards) <= 19);
  const deep = withAirYards.filter((r) => num(r.air_yards) >= 20);

  const cpoeRows = withAirYards.filter((r) => r.cp !== "" && r.cp !== "NA");
  const cpoe =
    cpoeRows.length === 0
      ? 0
      : (cpoeRows.reduce(
          (sum, r) => sum + ((bool01(r.complete_pass) ? 1 : 0) - num(r.cp)),
          0
        ) /
          cpoeRows.length) *
        100;

  const pressureRows = rows.filter((r) => bool01(r.qb_hit) || bool01(r.sack));
  const cleanRows = rows.filter((r) => !bool01(r.qb_hit) && !bool01(r.sack));
  const avgEpa = (arr: PbpRow[]) =>
    arr.length === 0 ? 0 : arr.reduce((sum, r) => sum + num(r.epa), 0) / arr.length;

  const ints = rows.filter((r) => bool01(r.interception)).length;

  return {
    attempts: rows.length,
    completions: completions.length,
    yards: rows.reduce((sum, r) => sum + num(r.yards_gained), 0),
    tds: rows.filter((r) => bool01(r.pass_touchdown)).length,
    ints,
    cpoe,
    accuracyByDepth: {
      short: depthBucket(short),
      medium: depthBucket(medium),
      deep: depthBucket(deep),
    },
    pressureEpa: avgEpa(pressureRows),
    cleanPocketEpa: avgEpa(cleanRows),
    // Real charting-based "turnover-worthy play rate" needs play-level
    // grading data we don't have from a free source. Interception rate is
    // used here as an honest, real (if narrower) substitute — it undercounts
    // near-picks a charter would flag, but every number in it is real.
    turnoverWorthyPlayRate: rows.length === 0 ? 0 : ints / rows.length,
  };
}

// Computes the same QB stat bundle for any team's current starter (most
// pass attempts this season) — used both for Maye's own deep dive and,
// called once per team, for the league-wide comparison table that powers
// his rank badges and the head-to-head picker.
function computeQbStats(
  pbp: PbpRow[],
  team: string,
  rosterByGsis: Map<string, RosterRow>
): QBDeepDive | null {
  const teamPasses = pbp.filter(
    (r) => r.posteam === team && bool01(r.pass_attempt) && r.passer_id
  );
  if (teamPasses.length === 0) return null;

  const attemptsByPasser = new Map<string, number>();
  for (const r of teamPasses) {
    attemptsByPasser.set(r.passer_id, (attemptsByPasser.get(r.passer_id) ?? 0) + 1);
  }
  const starterId = [...attemptsByPasser.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const starterRoster = rosterByGsis.get(starterId);
  const rows = teamPasses.filter((r) => r.passer_id === starterId);

  return {
    playerId: starterId,
    playerName: starterRoster?.full_name ?? rows[0]?.passer ?? "Unknown",
    headshotUrl: starterRoster?.headshot_url || undefined,
    team,
    ...qbStatsFromRows(rows),
  };
}

// The starter's stat bundle recomputed over just the last N games, for
// every N from 1 up to games played — reuses the same starterId already
// resolved for the full season so a window can never silently pick up a
// different passer (e.g. after a QB change) than the featured card shows.
function computeQbWindows(
  pbp: PbpRow[],
  team: string,
  starterId: string
): Array<{ key: string; label: string; stats: QBWindowStats }> {
  const teamPasses = pbp.filter(
    (r) => r.posteam === team && bool01(r.pass_attempt) && r.passer_id === starterId
  );
  return buildLastNGameWindows(pbp, team).map((window) => ({
    key: window.key,
    label: window.label,
    stats: qbStatsFromRows(filterRowsToWindow(teamPasses, window)),
  }));
}

// Ranks one team's QB against every other team's entry in the league
// table (not the full 32 — only teams with real pass-attempt data this
// season, so an early-season bye or missing starter doesn't quietly
// distort the percentile math with a fake zero).
function attachQbRanks(leagueTable: QBDeepDive[], team: string): QBDeepDive | null {
  const byTeam = new Map(leagueTable.map((q) => [q.team, q]));
  const mine = byTeam.get(team);
  if (!mine) return null;

  const teamsWithData = leagueTable.map((q) => q.team);
  const valueOf =
    (field: "cpoe" | "turnoverWorthyPlayRate" | "cleanPocketEpa" | "pressureEpa") =>
    (t: string) =>
      byTeam.get(t)?.[field] ?? 0;

  return {
    ...mine,
    ranks: {
      cpoe: rankGeneric(teamsWithData, team, valueOf("cpoe"), true),
      turnoverWorthyPlayRate: rankGeneric(teamsWithData, team, valueOf("turnoverWorthyPlayRate"), false),
      cleanPocketEpa: rankGeneric(teamsWithData, team, valueOf("cleanPocketEpa"), true),
      pressureEpa: rankGeneric(teamsWithData, team, valueOf("pressureEpa"), true),
    },
  };
}

async function main() {
  await mkdir(GENERATED_DIR, { recursive: true });
  const pbp = await loadCsv<PbpRow>("play_by_play_2026.csv");

  const depthChart = await buildDepthChart();
  await writeFile(
    path.join(GENERATED_DIR, "depth-chart.json"),
    JSON.stringify(depthChart, null, 2)
  );
  console.log(`Wrote depth-chart.json (${depthChart.length} position groups)`);

  const positionCards = await buildPositionGroupCards(pbp);
  await writeFile(
    path.join(GENERATED_DIR, "position-group-cards.json"),
    JSON.stringify(positionCards, null, 2)
  );
  console.log(
    `Wrote position-group-cards.json (${positionCards.length} real groups: QB/RB/WR/TE/OL/Edge/Interior DL/Secondary)`
  );

  const positionGroupLeagueTable = await buildPositionGroupLeagueTable(pbp);
  await writeFile(
    path.join(GENERATED_DIR, "position-group-league-table.json"),
    JSON.stringify(positionGroupLeagueTable, null, 2)
  );
  console.log(`Wrote position-group-league-table.json (${positionGroupLeagueTable.length} teams)`);

  const rosterByGsis = await buildLeagueRosterByGsis();
  const leagueQbTable = ALL_TEAMS
    .map((team) => computeQbStats(pbp, team, rosterByGsis))
    .filter((q): q is QBDeepDive => q !== null);
  await writeFile(
    path.join(GENERATED_DIR, "qb-league-table.json"),
    JSON.stringify(leagueQbTable, null, 2)
  );
  console.log(`Wrote qb-league-table.json (${leagueQbTable.length} starting QBs)`);

  const qb = attachQbRanks(leagueQbTable, TEAM);
  if (qb) {
    const qbWithWindows: QBDeepDive = {
      ...qb,
      windows: computeQbWindows(pbp, TEAM, qb.playerId),
    };
    await writeFile(
      path.join(GENERATED_DIR, "qb-deep-dive.json"),
      JSON.stringify(qbWithWindows, null, 2)
    );
    console.log(
      `Wrote qb-deep-dive.json (${qb.playerName}, ${qbWithWindows.windows!.length} game windows)`
    );
  } else {
    console.warn("qb-deep-dive.json not updated — no pass attempts found.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
