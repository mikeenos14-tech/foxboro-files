// Builds real depth chart, position-group report cards (offensive skill
// positions only — see note below), and a QB deep dive from nflverse's
// roster file + play-by-play. Run with: npx tsx scripts/build-roster-data.ts
// (after: npx tsx scripts/fetch-nflverse.ts)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num, bool01 } from "./lib/csv";
import { playTypeEpa, olFaultSackRateAllowed, sackRateGenerated, type PbpRow } from "./lib/pbp";
import { loadQbFaultSackKeys } from "./lib/ftn";
import {
  loadTeamRoster,
  buildLeagueRosterByGsis,
  type RosterRow,
} from "./lib/roster";
import { rankGeneric } from "./lib/rank";
import { ALL_TEAMS } from "./lib/teams";
import { ordinal } from "../lib/calc/ranks";
import type {
  DepthChartEntry,
  PositionGroupReportCard,
  QBDeepDive,
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

async function buildPositionGroupCards(
  pbp: PbpRow[]
): Promise<PositionGroupReportCard[]> {
  const rosterByGsis = await buildLeagueRosterByGsis();
  const qbFaultSackKeys = await loadQbFaultSackKeys();

  const groups: Array<{
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

  const playerAttributed = groups.map(({ label, idField, playType, rosterPosition }) => {
    const valueOf = (t: string) =>
      positionEpa(pbp, rosterByGsis, t, rosterPosition, idField, playType).epa;
    const ranked = rankGeneric(ALL_TEAMS, TEAM, valueOf, true);
    // Percentile doubles as a 0-100 "grade" by construction (50 = league
    // average) — that's the whole "vs. league" story, so the card shows
    // this number directly rather than a separate always-50 comparison.
    const grade = ranked.leaguePercentile;
    const { n } = positionEpa(pbp, rosterByGsis, TEAM, rosterPosition, idField, playType);
    return {
      group: label,
      grade,
      // Only one week of data so far — nothing to trend against yet.
      // Revisit once multiple weeks accumulate.
      trend: "flat" as const,
      soWhat: `${ordinal(grade)} percentile in the NFL for EPA/play generated at ${label} this season (${n} plays sampled).`,
    };
  });

  const unitGrade = (valueOf: (t: string) => number, higherIsBetter: boolean) =>
    rankGeneric(ALL_TEAMS, TEAM, valueOf, higherIsBetter).leaguePercentile;

  const teamUnits: PositionGroupReportCard[] = [
    {
      group: "OL",
      grade: unitGrade((t) => olFaultSackRateAllowed(pbp, t, qbFaultSackKeys), false),
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => olFaultSackRateAllowed(pbp, t, qbFaultSackKeys), false))} percentile in the NFL for sacks allowed that weren't the QB's own fault (real per-play charting data, not just raw sack rate — still team-wide, no per-player blocking grade available free).`,
    },
    {
      group: "Edge",
      grade: unitGrade((t) => sackRateGenerated(pbp, t), true),
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => sackRateGenerated(pbp, t), true))} percentile in the NFL for sack rate generated (pass rush proxy, team-wide — not isolated to edge rushers specifically).`,
    },
    {
      group: "Interior DL",
      grade: unitGrade((t) => playTypeEpa(pbp, t, "defteam", "run"), false),
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => playTypeEpa(pbp, t, "defteam", "run"), false))} percentile in the NFL for rush EPA allowed (run defense proxy, team-wide — not isolated to interior linemen specifically).`,
    },
    {
      group: "Secondary",
      grade: unitGrade((t) => playTypeEpa(pbp, t, "defteam", "pass"), false),
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => playTypeEpa(pbp, t, "defteam", "pass"), false))} percentile in the NFL for pass EPA allowed (pass defense proxy — includes pass rush effect, not isolated to coverage alone).`,
    },
  ];

  return [...playerAttributed, ...teamUnits];
}

// ---------- QB deep dive ----------

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
    playerId: starterId,
    playerName: starterRoster?.full_name ?? rows[0]?.passer ?? "Unknown",
    headshotUrl: starterRoster?.headshot_url || undefined,
    team,
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
    await writeFile(
      path.join(GENERATED_DIR, "qb-deep-dive.json"),
      JSON.stringify(qb, null, 2)
    );
    console.log(`Wrote qb-deep-dive.json (${qb.playerName})`);
  } else {
    console.warn("qb-deep-dive.json not updated — no pass attempts found.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
