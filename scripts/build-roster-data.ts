// Builds real depth chart, position-group report cards (offensive skill
// positions only — see note below), and a QB deep dive from nflverse's
// roster file + play-by-play. Run with: npx tsx scripts/build-roster-data.ts
// (after: npx tsx scripts/fetch-nflverse.ts)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num, bool01 } from "./lib/csv";
import { playTypeEpa, sackRateAllowed, sackRateGenerated, type PbpRow } from "./lib/pbp";
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
// pass protection (sack rate allowed), pass rush (sack rate generated),
// run defense (rush EPA allowed), and pass defense (pass EPA allowed)
// respectively. Each says so explicitly in its "so what" text.
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
    // average), so leagueAvg is always 50 here — that's not a coincidence,
    // it's what percentile-vs-the-other-31-teams means.
    const grade = ranked.leaguePercentile;
    const { n } = positionEpa(pbp, rosterByGsis, TEAM, rosterPosition, idField, playType);
    return {
      group: label,
      grade,
      leagueAvg: 50,
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
      grade: unitGrade((t) => sackRateAllowed(pbp, t), false),
      leagueAvg: 50,
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => sackRateAllowed(pbp, t), false))} percentile in the NFL for sack rate allowed (pass protection proxy — no per-player blocking data available free).`,
    },
    {
      group: "Edge",
      grade: unitGrade((t) => sackRateGenerated(pbp, t), true),
      leagueAvg: 50,
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => sackRateGenerated(pbp, t), true))} percentile in the NFL for sack rate generated (pass rush proxy, team-wide — not isolated to edge rushers specifically).`,
    },
    {
      group: "Interior DL",
      grade: unitGrade((t) => playTypeEpa(pbp, t, "defteam", "run"), false),
      leagueAvg: 50,
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => playTypeEpa(pbp, t, "defteam", "run"), false))} percentile in the NFL for rush EPA allowed (run defense proxy, team-wide — not isolated to interior linemen specifically).`,
    },
    {
      group: "Secondary",
      grade: unitGrade((t) => playTypeEpa(pbp, t, "defteam", "pass"), false),
      leagueAvg: 50,
      trend: "flat",
      soWhat: `${ordinal(unitGrade((t) => playTypeEpa(pbp, t, "defteam", "pass"), false))} percentile in the NFL for pass EPA allowed (pass defense proxy — includes pass rush effect, not isolated to coverage alone).`,
    },
  ];

  return [...playerAttributed, ...teamUnits];
}

// ---------- QB deep dive ----------

async function buildQbDeepDive(
  pbp: PbpRow[]
): Promise<QBDeepDive | null> {
  const rosterByGsis = await buildLeagueRosterByGsis();
  const teamPasses = pbp.filter(
    (r) => r.posteam === TEAM && bool01(r.pass_attempt) && r.passer_id
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

  const qb = await buildQbDeepDive(pbp);
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
