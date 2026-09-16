// One-off (well — once-a-year) tool: computes each team's full-season
// offensive and defensive splits from a completed season's real nflverse
// play-by-play data, and writes them as frozen constant tables to
// scripts/lib/priorSeasonStrength.ts. Those tables are the "preseason
// prior" blended with the current season's in-progress numbers — real
// prior-year performance instead of a blind guess, phased out linearly as
// real current-season games accumulate (see scripts/lib/priorBlend.ts).
//
// Run once at the start of each new season, pointed at the season that
// just finished: npx tsx scripts/compute-prior-strength.ts 2025

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { bool01, loadCsv, num } from "./lib/csv";
import { ALL_TEAMS } from "./lib/teams";
import type { PbpRow } from "./lib/pbp";

const RAW_DIR = path.join(process.cwd(), "data", "raw");

async function fetchPbp(season: string): Promise<string> {
  const filename = `play_by_play_${season}.csv`;
  const url = `https://github.com/nflverse/nflverse-data/releases/download/pbp/${filename}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(RAW_DIR, { recursive: true });
  await writeFile(path.join(RAW_DIR, filename), buf);
  return filename;
}

// Per-team average of `value(row)` over rows matching `filter`, for the
// given side of the ball ("posteam" for offense, "defteam" for defense).
function perTeamAverage(
  rows: PbpRow[],
  side: "posteam" | "defteam",
  filter: (r: PbpRow) => boolean,
  value: (r: PbpRow) => number
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const team of ALL_TEAMS) {
    const matched = rows.filter((r) => r[side] === team && filter(r));
    out[team] =
      matched.length === 0
        ? 0
        : Math.round((matched.reduce((s, r) => s + value(r), 0) / matched.length) * 10000) / 10000;
  }
  return out;
}

function toBody(table: Record<string, number>): string {
  return ALL_TEAMS.map((t) => `  ${t}: ${table[t]},`).join("\n");
}

async function main() {
  const season = process.argv[2];
  if (!season) {
    console.error("Usage: npx tsx scripts/compute-prior-strength.ts <season>");
    process.exit(1);
  }

  console.log(`Fetching play_by_play_${season}.csv ...`);
  const filename = await fetchPbp(season);
  const pbp = await loadCsv<PbpRow>(filename);

  // Regular season only — including playoffs would bias the sample toward
  // good teams (they play more games), skewing the very thing we're trying
  // to measure.
  const regSeason = pbp.filter((r) => r.season_type === "REG");

  const epaValue = (r: PbpRow) => num(r.epa);
  const isScrimmage = (r: PbpRow) => r.play_type === "run" || r.play_type === "pass";
  const isRun = (r: PbpRow) => r.play_type === "run";
  const isPass = (r: PbpRow) => r.play_type === "pass";
  const isPassAttempt = (r: PbpRow) => bool01(r.pass_attempt);
  const sackIndicator = (r: PbpRow) => (bool01(r.sack) ? 1 : 0);

  const tables = {
    PRIOR_OFFENSE_EPA: perTeamAverage(regSeason, "posteam", isScrimmage, epaValue),
    PRIOR_DEFENSE_EPA: perTeamAverage(regSeason, "defteam", isScrimmage, epaValue),
    PRIOR_RUSH_OFFENSE_EPA: perTeamAverage(regSeason, "posteam", isRun, epaValue),
    PRIOR_RUSH_DEFENSE_EPA: perTeamAverage(regSeason, "defteam", isRun, epaValue),
    PRIOR_PASS_OFFENSE_EPA: perTeamAverage(regSeason, "posteam", isPass, epaValue),
    PRIOR_PASS_DEFENSE_EPA: perTeamAverage(regSeason, "defteam", isPass, epaValue),
    PRIOR_SACK_RATE_ALLOWED: perTeamAverage(regSeason, "posteam", isPassAttempt, sackIndicator),
    PRIOR_SACK_RATE_GENERATED: perTeamAverage(regSeason, "defteam", isPassAttempt, sackIndicator),
  };

  const outPath = path.join(process.cwd(), "scripts", "lib", "priorSeasonStrength.ts");
  const exports = Object.entries(tables)
    .map(([name, table]) => `export const ${name}: Record<string, number> = {\n${toBody(table)}\n};`)
    .join("\n\n");
  const content = `// Frozen reference: each team's full-season offensive/defensive splits
// from the ${season} season, computed from real nflverse play-by-play data
// via scripts/compute-prior-strength.ts. Used as the "preseason prior"
// blended with the current season's in-progress numbers (see
// scripts/lib/priorBlend.ts) so one or two early games don't single-
// handedly swing win probabilities, EPA rankings, or position-group
// matchup grades.
//
// Regenerate at the start of each new season, once the prior season is
// final: npx tsx scripts/compute-prior-strength.ts <season>
export const PRIOR_SEASON = ${season};

${exports}
`;

  await writeFile(outPath, content);
  console.log(`Wrote scripts/lib/priorSeasonStrength.ts from ${season} season data.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
