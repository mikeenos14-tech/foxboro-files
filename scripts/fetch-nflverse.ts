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
  for (const { name, url } of SOURCES) {
    await fetchOne(name, url);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
