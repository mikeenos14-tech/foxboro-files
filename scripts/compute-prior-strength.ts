// One-off (well — once-a-year) tool: computes each team's full-season
// offensive and defensive EPA/play from a completed season's real nflverse
// play-by-play data, and writes them as frozen constant tables to
// scripts/lib/priorSeasonStrength.ts. Those tables are the "preseason
// prior" blended with the current season's in-progress EPA — real
// prior-year performance instead of a blind guess, phased out linearly as
// real current-season games accumulate (see scripts/lib/priorBlend.ts).
//
// Run once at the start of each new season, pointed at the season that
// just finished: npx tsx scripts/compute-prior-strength.ts 2025

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv, num } from "./lib/csv";
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

  const offenseEpa: Record<string, number> = {};
  const defenseEpa: Record<string, number> = {};
  for (const team of ALL_TEAMS) {
    const off = regSeason.filter(
      (r) => r.posteam === team && (r.play_type === "run" || r.play_type === "pass")
    );
    const def = regSeason.filter(
      (r) => r.defteam === team && (r.play_type === "run" || r.play_type === "pass")
    );
    offenseEpa[team] =
      off.length === 0 ? 0 : Math.round((off.reduce((s, r) => s + num(r.epa), 0) / off.length) * 10000) / 10000;
    defenseEpa[team] =
      def.length === 0 ? 0 : Math.round((def.reduce((s, r) => s + num(r.epa), 0) / def.length) * 10000) / 10000;
  }

  const outPath = path.join(process.cwd(), "scripts", "lib", "priorSeasonStrength.ts");
  const offBody = ALL_TEAMS.map((t) => `  ${t}: ${offenseEpa[t]},`).join("\n");
  const defBody = ALL_TEAMS.map((t) => `  ${t}: ${defenseEpa[t]},`).join("\n");
  const content = `// Frozen reference: each team's full-season offensive and defensive
// EPA/play from the ${season} season, computed from real nflverse play-by-play
// data via scripts/compute-prior-strength.ts. Used as the "preseason prior"
// blended with the current season's in-progress EPA (see
// scripts/lib/priorBlend.ts) so one or two early games don't single-handedly
// swing win probabilities or EPA rankings.
//
// Regenerate at the start of each new season, once the prior season is
// final: npx tsx scripts/compute-prior-strength.ts <season>
export const PRIOR_SEASON = ${season};

export const PRIOR_OFFENSE_EPA: Record<string, number> = {
${offBody}
};

export const PRIOR_DEFENSE_EPA: Record<string, number> = {
${defBody}
};
`;

  await writeFile(outPath, content);
  console.log(`Wrote scripts/lib/priorSeasonStrength.ts from ${season} season data.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
