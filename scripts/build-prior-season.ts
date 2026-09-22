// Computes a complete, frozen snapshot of a finished season — team
// strength, position-group grades, and QB stats — so the site's window
// selectors can offer "2025 Season" alongside "Last 3 Games".
//
// Why this is separate from the daily build: a completed season never
// changes, and its play-by-play file is ~10MB. Recomputing it on every
// scheduled refresh would be pure waste. This runs once per season and
// commits its output, the same way scripts/compute-prior-strength.ts
// produces the frozen prior-season constants.
//
// Run with: npx tsx scripts/build-prior-season.ts 2025
//
// Note this is a different thing from priorSeasonStrength.ts. That file
// holds team-level EPA constants used to *blend* into current-season
// predictive numbers. This produces a full browsable snapshot the user
// can actually look at — "how good was our running game last year" was
// previously unanswerable on the site despite being a core use case.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { loadCsv, num, bool01 } from "./lib/csv";
import { offenseStats, defenseStats, type PbpRow } from "./lib/pbp";
import { computeAdjustedEpa } from "./lib/leagueRanks";
import { computeStandings, pointDiff } from "./lib/standings";
import { rankGeneric } from "./lib/rank";
import { ALL_TEAMS } from "./lib/teams";
import { confidenceLabel } from "./lib/shrink";
import { GROUP_METRICS, gradeGroupAllTeams } from "./lib/positionGrades";
import type { RosterRow } from "./lib/roster";
import type { PriorSeasonSnapshot } from "../lib/data/types";
import { passerId } from "./lib/playerIds";

const TEAM = "NE";
const RAW_DIR = path.join(process.cwd(), "data", "raw");
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

async function ensureFile(filename: string, url: string): Promise<void> {
  const dest = path.join(RAW_DIR, filename);
  if (existsSync(dest)) {
    console.log(`${filename} already cached.`);
    return;
  }
  console.log(`Fetching ${filename}…`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const season = process.argv[2];
  if (!season || !/^\d{4}$/.test(season)) {
    console.error("Usage: npx tsx scripts/build-prior-season.ts <season>   e.g. 2025");
    process.exit(1);
  }

  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(GENERATED_DIR, { recursive: true });

  await ensureFile(
    `play_by_play_${season}.csv`,
    `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv`
  );
  await ensureFile(
    `roster_${season}.csv`,
    `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${season}.csv`
  );

  const pbp = await loadCsv<PbpRow>(`play_by_play_${season}.csv`);
  const rosterRows = await loadCsv<RosterRow>(`roster_${season}.csv`);

  // Latest-week snapshot per player, same approach as the current-season
  // roster loader.
  const rosterByGsis = new Map<string, RosterRow>();
  for (const r of [...rosterRows].sort((a, b) => num(a.week) - num(b.week))) {
    if (r.gsis_id) rosterByGsis.set(r.gsis_id, r);
  }

  console.log(`Loaded ${pbp.length} plays and ${rosterByGsis.size} players for ${season}.`);

  // ---------- Team strength ----------
  // Opponent-adjusted over a full season, so no prior-season blend and no
  // thin-sample caveats — this is the one snapshot on the site that's
  // genuinely well-sampled.
  const adjusted = computeAdjustedEpa(pbp, ALL_TEAMS);
  const priorStandings = computeStandings(await loadCsv("games.csv"), Number(season));
  const teamStrength = {
    epaPerPlay: {
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => adjusted.offense.get(t) ?? 0, true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => adjusted.defense.get(t) ?? 0, false),
    },
    successRate: {
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => offenseStats(pbp, t).successRate, true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => defenseStats(pbp, t).successRate, false),
    },
    yardsPerPlay: {
      offense: rankGeneric(ALL_TEAMS, TEAM, (t) => offenseStats(pbp, t).yardsPerPlay, true),
      defense: rankGeneric(ALL_TEAMS, TEAM, (t) => defenseStats(pbp, t).yardsPerPlay, false),
    },
    pointDifferential: rankGeneric(ALL_TEAMS, TEAM, (t) => pointDiff(priorStandings.get(t)), true),
  };

  // ---------- Position groups ----------
  // Uses the exact same pipeline as the current season (opponent-adjust,
  // shrink, rank) so a 2025 grade and a 2026 grade mean the same thing.
  // Comparing a raw prior-season grade against an adjusted current one
  // would be the whole point of the feature, broken.
  //
  // Over a full season the shrinkage barely moves anything — which is
  // correct: the correction is sample-size driven, so it fades out on its
  // own once the sample is real.
  const positionGroups = GROUP_METRICS.map((metric) => {
    const g = gradeGroupAllTeams(pbp, ALL_TEAMS, rosterByGsis, metric).get(TEAM)!;
    return {
      group: metric.label,
      grade: g.grade,
      sampleSize: g.sampleSize,
      confidence: confidenceLabel(g.sampleSize, metric.shrinkK),
    };
  });

  // ---------- QB ----------
  // The team's primary passer that season, by attempts.
  const teamPasses = pbp.filter((r) => r.posteam === TEAM && bool01(r.pass_attempt) && passerId(r));
  const attemptsByPasser = new Map<string, number>();
  for (const r of teamPasses) {
    attemptsByPasser.set(passerId(r), (attemptsByPasser.get(passerId(r)) ?? 0) + 1);
  }
  const starterId = [...attemptsByPasser.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const rows = teamPasses.filter((r) => passerId(r) === starterId);
  const completions = rows.filter((r) => bool01(r.complete_pass));
  const withAirYards = rows.filter((r) => r.air_yards !== "" && r.air_yards !== "NA");
  const depthBucket = (bucket: PbpRow[]) =>
    bucket.length === 0 ? 0 : bucket.filter((r) => bool01(r.complete_pass)).length / bucket.length;
  const cpoeRows = withAirYards.filter((r) => r.cp !== "" && r.cp !== "NA");
  const avgEpa = (arr: PbpRow[]) => (arr.length === 0 ? 0 : arr.reduce((s, r) => s + num(r.epa), 0) / arr.length);
  const ints = rows.filter((r) => bool01(r.interception)).length;

  const qb = {
    playerName: rosterByGsis.get(starterId ?? "")?.full_name ?? rows[0]?.passer ?? "Unknown",
    attempts: rows.length,
    completions: completions.length,
    yards: rows.reduce((s, r) => s + num(r.yards_gained), 0),
    tds: rows.filter((r) => bool01(r.pass_touchdown)).length,
    ints,
    cpoe:
      cpoeRows.length === 0
        ? 0
        : (cpoeRows.reduce((s, r) => s + ((bool01(r.complete_pass) ? 1 : 0) - num(r.cp)), 0) / cpoeRows.length) * 100,
    accuracyByDepth: {
      short: depthBucket(withAirYards.filter((r) => num(r.air_yards) >= 0 && num(r.air_yards) <= 9)),
      medium: depthBucket(withAirYards.filter((r) => num(r.air_yards) >= 10 && num(r.air_yards) <= 19)),
      deep: depthBucket(withAirYards.filter((r) => num(r.air_yards) >= 20)),
    },
    pressureEpa: avgEpa(rows.filter((r) => bool01(r.qb_hit) || bool01(r.sack))),
    cleanPocketEpa: avgEpa(rows.filter((r) => !bool01(r.qb_hit) && !bool01(r.sack))),
    turnoverWorthyPlayRate: rows.length === 0 ? 0 : ints / rows.length,
  };

  const snapshot: PriorSeasonSnapshot = {
    season: Number(season),
    team: TEAM,
    teamStrength,
    positionGroups,
    qb,
  };

  await writeFile(
    path.join(GENERATED_DIR, `prior-season-${season}.json`),
    JSON.stringify(snapshot, null, 2)
  );
  console.log(
    `Wrote prior-season-${season}.json — ${qb.playerName} at QB, ${positionGroups.length} position groups.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
