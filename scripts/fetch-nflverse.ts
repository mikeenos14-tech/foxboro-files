// Downloads the nflverse source files we need into data/raw/.
// Source: nflverse/nflverse-data GitHub releases (CC-BY 4.0), verified
// directly against the release asset listing rather than assumed from memory.
// Run with: npx tsx scripts/fetch-nflverse.ts

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const RAW_DIR = path.join(process.cwd(), "data", "raw");

const SOURCES: Array<{ name: string; url: string; gzip?: boolean }> = [
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
  {
    // nflverse's OWN season aggregation of per-player box-score stats.
    // Not used to render anything — it's the independent check that our
    // play-by-play aggregation agrees with the canonical numbers. See
    // verify-data.ts.
    name: "stats_player_reg_2026.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2026.csv",
  },
  {
    // Same check for the frozen "2025 Season" snapshot
    // (prior-season-2025.json), which is otherwise never re-verified.
    name: "stats_player_reg_2025.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2025.csv",
  },
  {
    // FTN's per-play charting data (real human-charted, not derived from
    // play-by-play): QB-fault sacks, turnover-worthy throws, play-action,
    // blitz and pocket splits, and catchable/drop/contested flags for
    // receivers. Joins to play_by_play_2026.csv via
    // nflverse_game_id/nflverse_play_id == game_id/play_id.
    name: "ftn_charting_2026.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_2026.csv",
  },
  // Next Gen Stats (player tracking): time to throw, tight-window throws,
  // receiver separation, rush yards over expected. Published for the
  // current season and updated weekly — unlike FTN it doesn't trail the
  // games. One gzipped file per stat family, every season since 2016;
  // week 0 rows are season totals for players over NGS's minimums.
  {
    name: "ngs_passing.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_passing.csv.gz",
    gzip: true,
  },
  {
    name: "ngs_receiving.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_receiving.csv.gz",
    gzip: true,
  },
  {
    name: "ngs_rushing.csv",
    url: "https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_rushing.csv.gz",
    gzip: true,
  },
];

async function fetchOne(name: string, url: string, gzip = false) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${name}: ${res.status} ${res.statusText}`);
  }
  const raw = Buffer.from(await res.arrayBuffer());
  const buf = gzip ? gunzipSync(raw) : raw;
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
  for (const { name, url, gzip } of targets) {
    await fetchOne(name, url, gzip);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
