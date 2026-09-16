// One-off (well — once-a-year) tool: computes each team's full-season net
// EPA/play (offense EPA/play minus defense EPA/play) from a completed
// season's real nflverse play-by-play data, and writes it as a frozen
// constant table to scripts/lib/priorSeasonStrength.ts. That table is the
// "preseason prior" build-data.ts blends with the current season's
// in-progress EPA — real prior-year performance instead of a blind guess,
// used only until enough current-season games accumulate to speak for
// themselves (see the shrinkage blend in build-data.ts).
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

  const netEpa: Record<string, number> = {};
  for (const team of ALL_TEAMS) {
    const off = regSeason.filter(
      (r) => r.posteam === team && (r.play_type === "run" || r.play_type === "pass")
    );
    const def = regSeason.filter(
      (r) => r.defteam === team && (r.play_type === "run" || r.play_type === "pass")
    );
    const offEpa = off.length === 0 ? 0 : off.reduce((s, r) => s + num(r.epa), 0) / off.length;
    const defEpa = def.length === 0 ? 0 : def.reduce((s, r) => s + num(r.epa), 0) / def.length;
    netEpa[team] = Math.round((offEpa - defEpa) * 10000) / 10000;
  }

  const outPath = path.join(process.cwd(), "scripts", "lib", "priorSeasonStrength.ts");
  const body = ALL_TEAMS.map((t) => `  ${t}: ${netEpa[t]},`).join("\n");
  const content = `// Frozen reference: each team's full-season net EPA/play (offense minus
// defense) from the ${season} season, computed from real nflverse play-by-play
// data via scripts/compute-prior-strength.ts. Used as the "preseason prior"
// in build-data.ts's win-probability model, blended with the current
// season's in-progress EPA via games-played shrinkage so one or two early
// games don't single-handedly swing every remaining game's odds — see the
// blend in build-data.ts for how the weighting works.
//
// Regenerate at the start of each new season, once the prior season is
// final: npx tsx scripts/compute-prior-strength.ts <season>
export const PRIOR_SEASON = ${season};

export const PRIOR_NET_EPA: Record<string, number> = {
${body}
};
`;

  await writeFile(outPath, content);
  console.log(`Wrote scripts/lib/priorSeasonStrength.ts from ${season} season data.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
