// Builds real depth chart, position-group report cards (offensive skill
// positions only — see note below), and a QB deep dive from nflverse's
// roster file + play-by-play. Run with: npx tsx scripts/build-roster-data.ts
// (after: npx tsx scripts/fetch-nflverse.ts)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num, bool01 } from "./lib/csv";
import type { PbpRow } from "./lib/pbp";
import { loadInterceptionWorthyKeys, loadPlayContext, type FtnPlayContext } from "./lib/ftn";
import { computeDefensivePlayerStats, defensiveGroupStatLine } from "./lib/defensiveStats";
import { receivingLeaders, rushingLeaders, defensiveLeaders } from "./lib/leaderboards";
import {
  loadTeamRoster,
  buildLeagueRosterByGsis,
  type RosterRow,
} from "./lib/roster";
import { rankGeneric } from "./lib/rank";
import { ALL_TEAMS } from "./lib/teams";
import { buildLastNGameWindows, filterRowsToWindow } from "./lib/statWindows";
import { confidenceLabel } from "./lib/shrink";
import { GROUP_METRICS, gradeGroupAllTeams, type GroupGrade } from "./lib/positionGrades";
import { leagueMean, shrink } from "./lib/shrink";
import { SHRINK_K } from "./lib/shrink";
import {
  receivingSplit,
  positionTargets,
  receivingDetailLine,
  receiverIsolatedGrade,
} from "./lib/receiving";
import { loadReceivingFlags } from "./lib/ftn";
import { trendFor } from "./lib/trend";
import { loadGates, gateStateFor, recordGate, saveGates } from "./lib/gateStore";
import type {
  DepthChartEntry,
  PositionGroupReportCard,
  PositionGroupLeagueTeamEntry,
  QBDeepDive,
  TeamLeaderboards,
  QBWindowStats,
  QbSituationalSplit,
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

async function buildPositionGroupCards(
  pbp: PbpRow[],
  gradesByGroup: Map<string, Map<string, GroupGrade>>,
  windowGradesByGroup: Map<string, Array<{ key: string; label: string; grade: number }>>
): Promise<PositionGroupReportCard[]> {
  const rosterByGsis = await buildLeagueRosterByGsis();

  // Receiver-isolated grades for WR/TE. Their headline grade is EPA per
  // target, which is mostly a measure of the quarterback — this grades
  // what the receiver controls once the ball arrives. See lib/receiving.ts.
  const receivingFlags = await loadReceivingFlags();

  // Gate state persists across builds so a rank that's already been
  // earned this season doesn't blink off on a noisy week. See
  // lib/reliability.ts for why a single threshold flickers.
  const season = Math.max(...pbp.map((r) => +r.season || 0));
  const currentWeek = Math.max(...pbp.map((r) => +r.week || 0));
  const gates = await loadGates(season);
  const receiverExtras = new Map<
    string,
    { label: string; grade: number | null; detail: string; note?: string }
  >();
  for (const position of ["WR", "TE"] as const) {
    const splits = new Map(
      ALL_TEAMS.map((t) => [
        t,
        receivingSplit(positionTargets(pbp, rosterByGsis, t, position, "posteam"), receivingFlags),
      ])
    );
    const result = receiverIsolatedGrade(splits, ALL_TEAMS, TEAM, SHRINK_K.receivingEpa, {
      leagueMean,
      shrink,
      rank: (teams, team, valueOf, higherIsBetter) =>
        rankGeneric(teams, team, valueOf, higherIsBetter).leaguePercentile,
    }, (label) => gateStateFor(gates, `${position}:${label}`));
    for (const d of result.diagnostics) {
      recordGate(gates, `${position}:${d.label}`, d.open, currentWeek);
    }
    const detail = receivingDetailLine(splits.get(TEAM)!);
    // Logged every run because the gate is the interesting part: it says
    // whether a league rank is being withheld and why.
    console.log(
      `  ${position} receiver-isolated: ${result.grade ?? "no rank"} ` +
        result.diagnostics
          .map((d) => `[${d.label} reliability=${d.reliability.toFixed(2)} n=${d.n} ${d.open ? "OPEN" : "held"}]`)
          .join(" ")
    );
    if (detail) {
      receiverExtras.set(position, {
        label: "Hands & YAC (QB-independent)",
        grade: result.grade,
        detail,
        note:
          result.grade === null
            ? "Not ranked yet — teams are still closer together than chance alone explains."
            : undefined,
      });
    }
  }
  await saveGates(gates);

  const defPlayerStats = computeDefensivePlayerStats(pbp, TEAM);

  // Extra descriptive context per group. The grade itself is uniform
  // across all eight (see lib/positionGrades.ts); this is the traditional
  // stat line underneath it, which is genuinely different per group.
  const statLineFor = (group: string): string => {
    switch (group) {
      case "RB":
        return rushingStatLine(pbp, rosterByGsis, TEAM);
      case "WR":
      case "TE":
        return receivingStatLine(pbp, rosterByGsis, TEAM, group);
      case "Edge":
        return defensiveGroupStatLine(defPlayerStats, rosterByGsis, ["OLB"], "sacks", "sacks", "qbHits", "QB hits");
      case "Interior DL":
        return defensiveGroupStatLine(defPlayerStats, rosterByGsis, ["DT", "NT", "DE"], "tfl", "TFL", "sacks", "sacks");
      case "Secondary":
        return defensiveGroupStatLine(
          defPlayerStats,
          rosterByGsis,
          ["CB", "FS", "SS", "S"],
          "interceptions",
          "INT",
          "passesDefended",
          "PBU"
        );
      default:
        // QB has its own deep dive; OL has no free per-player blocking
        // data, so the grade is the whole story there.
        return "";
    }
  };

  const soWhatFor = (group: string, sampleSize: number): string => {
    switch (group) {
      case "QB":
      case "RB":
      case "WR":
      case "TE":
        return `Opponent-adjusted EPA/play at ${group}, regressed to the league mean on a ${sampleSize}-play sample.`;
      case "OL":
        return `Opponent-adjusted pressure rate allowed — sacks or QB hits, so a beaten block still counts when a quick throw bails it out. Team-wide; no per-player blocking data exists free.`;
      case "Edge":
        return `Opponent-adjusted sack rate generated — a pass-rush proxy measured team-wide, not isolated to edge rushers.`;
      case "Interior DL":
        return `Opponent-adjusted rush EPA allowed — a run-defense proxy measured team-wide, not isolated to interior linemen.`;
      case "Secondary":
        return `Opponent-adjusted pass EPA allowed — includes the pass rush's effect, not coverage alone.`;
      default:
        return "";
    }
  };

  return GROUP_METRICS.map((metric) => {
    const grade = gradesByGroup.get(metric.label)!.get(TEAM)!;
    const windows = windowGradesByGroup.get(metric.label) ?? [];
    return {
      group: metric.label,
      grade: grade.grade,
      trend: trendFor(windows),
      soWhat: soWhatFor(metric.label, grade.sampleSize),
      windows,
      statLine: statLineFor(metric.label),
      sampleSize: grade.sampleSize,
      confidence: confidenceLabel(grade.sampleSize, metric.shrinkK),
      secondaryGrade: receiverExtras.get(metric.label),
    };
  });
}

// Every team's grade in every group, full-season only (no windowing —
// same scope as the QB head-to-head tool this mirrors), for the
// position-group compare tool. rawValue/rawLabel carry the underlying
// metric so the comparison shows a real number, not just a percentile.
//
// Built from the same gradesByGroup the cards use, so the compare tool
// and the cards can't disagree about the same team's same group —
// verify-data.ts asserts exactly that.
function buildPositionGroupLeagueTable(
  gradesByGroup: Map<string, Map<string, GroupGrade>>
): PositionGroupLeagueTeamEntry[] {
  const rawLabelFor = (group: string): string => {
    switch (group) {
      case "QB":
      case "RB":
      case "WR":
      case "TE":
        return "Adj. EPA/play";
      case "OL":
        return "Adj. pressure rate allowed";
      case "Edge":
        return "Adj. sack rate generated";
      case "Interior DL":
        return "Adj. rush EPA allowed";
      default:
        return "Adj. pass EPA allowed";
    }
  };

  return ALL_TEAMS.map((team) => ({
    team,
    groups: GROUP_METRICS.map((metric) => {
      const g = gradesByGroup.get(metric.label)!.get(team)!;
      return {
        group: metric.label,
        grade: g.grade,
        rawValue: g.adjustedValue,
        rawLabel: rawLabelFor(metric.label),
      };
    }),
  }));
}


// ---------- QB deep dive ----------

// Pure stat computation given an already-filtered set of one passer's
// pass-attempt rows — shared by the full-season computation below and by
// the per-window ("last N games") computation, which just feeds this a
// smaller row set.
function qbStatsFromRows(rows: PbpRow[], twpKeys?: Set<string>): QBWindowStats {
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
    // Real charted turnover-worthy plays when FTN's charting is
    // available (see lib/ftn.ts) — this counts the dropped interceptions
    // a charter flags and excludes picks that weren't the QB's fault.
    // Falls back to raw interception rate only if the charting file is
    // missing, which is a narrower but still real measure.
    turnoverWorthyPlayRate:
      rows.length === 0
        ? 0
        : twpKeys
          ? rows.filter((r) => twpKeys.has(`${r.game_id}|${r.play_id}`)).length / rows.length
          : ints / rows.length,
  };
}

// Computes the same QB stat bundle for any team's current starter (most
// pass attempts this season) — used both for Maye's own deep dive and,
// called once per team, for the league-wide comparison table that powers
// his rank badges and the head-to-head picker.
function computeQbStats(
  pbp: PbpRow[],
  team: string,
  rosterByGsis: Map<string, RosterRow>,
  twpKeys?: Set<string>
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
    ...qbStatsFromRows(rows, twpKeys),
  };
}

// The starter's stat bundle recomputed over just the last N games, for
// every N from 1 up to games played — reuses the same starterId already
// resolved for the full season so a window can never silently pick up a
// different passer (e.g. after a QB change) than the featured card shows.
function computeQbWindows(
  pbp: PbpRow[],
  team: string,
  starterId: string,
  twpKeys?: Set<string>
): Array<{ key: string; label: string; stats: QBWindowStats }> {
  const teamPasses = pbp.filter(
    (r) => r.posteam === team && bool01(r.pass_attempt) && r.passer_id === starterId
  );
  return buildLastNGameWindows(pbp, team).map((window) => ({
    key: window.key,
    label: window.label,
    stats: qbStatsFromRows(filterRowsToWindow(teamPasses, window), twpKeys),
  }));
}

// Real charted situational splits — what actually explains a QB's
// overall number. FTN charts play-action, screens, blitzers faced and
// whether the QB left the pocket on every play; the site was fetching
// all of it every run and using none of it.
function computeQbSituational(
  rows: PbpRow[],
  ctx: Map<string, FtnPlayContext>
): QbSituationalSplit[] {
  const total = rows.length;
  if (total === 0) return [];

  const split = (label: string, pred: (c: FtnPlayContext) => boolean): QbSituationalSplit | null => {
    const matched = rows.filter((r) => {
      const c = ctx.get(`${r.game_id}|${r.play_id}`);
      return c ? pred(c) : false;
    });
    // Below ~8 plays the EPA average is one throw away from meaningless,
    // so the split is omitted rather than shown as a number.
    if (matched.length < 8) return null;
    return {
      label,
      epa: matched.reduce((sum, r) => sum + num(r.epa), 0) / matched.length,
      plays: matched.length,
      shareOfDropbacks: matched.length / total,
    };
  };

  return [
    split("Play action", (c) => c.isPlayAction),
    split("No play action", (c) => !c.isPlayAction),
    split("Blitzed (5+ rushers)", (c) => c.blitzers > 0),
    split("Not blitzed", (c) => c.blitzers === 0),
    split("Outside the pocket", (c) => c.isOutOfPocket),
    split("Screens", (c) => c.isScreen),
  ].filter((s): s is QbSituationalSplit => s !== null);
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

  // Opponent adjustment is the expensive step, so every group is graded
  // once here and the result is shared by the cards, the league-wide
  // compare table, and the windowed trends.
  const roster = await buildLeagueRosterByGsis();
  const gradesByGroup = new Map(
    GROUP_METRICS.map((m) => [m.label, gradeGroupAllTeams(pbp, ALL_TEAMS, roster, m)])
  );

  // Windowed grades use the same pipeline over a narrower row set. Each
  // team's window is its own last-N games, so a team with fewer games
  // clamps to what it has (see windowedRowsByTeamAndIndex).
  const rowsFor = windowedRowsByTeamAndIndex(pbp, ALL_TEAMS);
  const windowLabels = buildLastNGameWindows(pbp, TEAM).map((w) => ({ key: w.key, label: w.label }));
  const windowGradesByGroup = new Map(
    GROUP_METRICS.map((m) => [
      m.label,
      windowLabels.map(({ key, label }, i) => {
        // Every team evaluated over its own i-th window, so the ranking
        // compares like with like.
        const windowRows = ALL_TEAMS.flatMap((t) => rowsFor(t, i));
        const deduped = [...new Map(windowRows.map((r) => [`${r.game_id}|${r.play_id}`, r])).values()];
        return { key, label, grade: gradeGroupAllTeams(deduped, ALL_TEAMS, roster, m).get(TEAM)!.grade };
      }),
    ])
  );

  const positionCards = await buildPositionGroupCards(pbp, gradesByGroup, windowGradesByGroup);
  await writeFile(
    path.join(GENERATED_DIR, "position-group-cards.json"),
    JSON.stringify(positionCards, null, 2)
  );
  console.log(
    `Wrote position-group-cards.json (${positionCards.length} real groups: QB/RB/WR/TE/OL/Edge/Interior DL/Secondary)`
  );

  const leaderboards: TeamLeaderboards = {
    receiving: receivingLeaders(pbp, await buildLeagueRosterByGsis(), TEAM, await loadReceivingFlags()),
    rushing: rushingLeaders(pbp, await buildLeagueRosterByGsis(), TEAM),
    defense: defensiveLeaders(pbp, await buildLeagueRosterByGsis(), TEAM),
  };
  await writeFile(
    path.join(GENERATED_DIR, "leaderboards.json"),
    JSON.stringify(leaderboards, null, 2)
  );
  console.log(
    `Wrote leaderboards.json (${leaderboards.receiving.length} receivers, ${leaderboards.rushing.length} rushers, ${leaderboards.defense.length} defenders)`
  );

  const positionGroupLeagueTable = buildPositionGroupLeagueTable(gradesByGroup);
  await writeFile(
    path.join(GENERATED_DIR, "position-group-league-table.json"),
    JSON.stringify(positionGroupLeagueTable, null, 2)
  );
  console.log(`Wrote position-group-league-table.json (${positionGroupLeagueTable.length} teams)`);

  const rosterByGsis = await buildLeagueRosterByGsis();
  const twpKeys = await loadInterceptionWorthyKeys();
  const playContext = await loadPlayContext();
  const leagueQbTable = ALL_TEAMS
    .map((team) => computeQbStats(pbp, team, rosterByGsis, twpKeys))
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
      windows: computeQbWindows(pbp, TEAM, qb.playerId, twpKeys),
      situational: computeQbSituational(
        pbp.filter((r) => r.posteam === TEAM && bool01(r.pass_attempt) && r.passer_id === qb.playerId),
        playContext
      ),
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
