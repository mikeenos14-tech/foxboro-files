// Downloads the nflverse source files we need into data/raw/.
// Source: nflverse/nflverse-data GitHub releases (CC-BY 4.0), verified
// directly against the release asset listing rather than assumed from memory.
// Run with: npx tsx scripts/fetch-nflverse.ts

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RAW_DIR = path.join(process.cwd(), "data", "raw");

const SOURCES: Array<{ name: string; url: string }> = [
  {
    name: "games.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv",
  },
  {
    name: "play_by_play_2026.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2026.csv",
  },
  {
    // Weekly roster snapshots — also doubles as the gsis_id <-> espn_id
    // crosswalk that lets us join play-by-play (gsis_id) to ESPN headshots
    // and news (espn_id) for the same player.
    name: "roster_2026.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2026.csv",
  },
  {
    // Official, team-reported weekly injury report: practice participation
    // + game-status designation + real injury body part. Preferred over
    // ESPN's roster-embedded injury status when it has the target week
    // published (see build-espn-data.ts's fallback logic).
    name: "injuries_2026.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2026.csv",
  },
];

async function fetchOne(name: string, url: string) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${name}: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(RAW_DIR, name), buf);
  console.log(`Saved ${name} (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  // Optional CLI args restrict the fetch to specific files by name, e.g.
  // `npx tsx scripts/fetch-nflverse.ts injuries_2026.csv` — used by the
  // headlines workflow, which only needs the (small, fast-changing)
  // injuries file and shouldn't re-pull the much larger play-by-play/
  // roster files every 3 hours. No args fetches everything, as before.
  const only = process.argv.slice(2);
  const targets = only.length > 0 ? SOURCES.filter((s) => only.includes(s.name)) : SOURCES;
  for (const { name, url } of targets) {
    await fetchOne(name, url);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
