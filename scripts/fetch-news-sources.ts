// Downloads news/injury/roster/odds sources into data/raw/: ESPN's public
// (undocumented, no-auth) endpoints, plus the official patriots.com RSS
// feed. ESPN's endpoints are unofficial and can change without notice —
// build-espn-data.ts is written to fail soft (keep last-good generated
// JSON) rather than crash the site if a source changes shape.
// Run with: npx tsx scripts/fetch-news-sources.ts
// (after: npx tsx scripts/build-data.ts, so next-game.json exists — that's
// how we know which opponent's roster/injuries to fetch)

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { ESPN_TEAM_ID } from "./lib/espnTeams";
import type { Game } from "../lib/data/types";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const TEAM = "NE";

async function readNextGame(): Promise<Game | null> {
  try {
    const content = await readFile(path.join(GENERATED_DIR, "next-game.json"), "utf-8");
    return JSON.parse(content) as Game;
  } catch {
    return null;
  }
}

async function fetchOne(name: string, url: string) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${name}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  await writeFile(path.join(RAW_DIR, name), text);
  console.log(`Saved ${name} (${(text.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  const nextGame = await readNextGame();
  const opponent = nextGame ? (nextGame.homeTeam === TEAM ? nextGame.awayTeam : nextGame.homeTeam) : null;

  const sources: Array<{ name: string; url: string }> = [
    {
      name: "espn-news.json",
      url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?team=${ESPN_TEAM_ID[TEAM]}&limit=20`,
    },
    {
      name: "espn-roster.json",
      url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${ESPN_TEAM_ID[TEAM]}/roster`,
    },
    {
      // Official team RSS — 100% team-specific, no ESPN-style noise
      // filtering needed, and it's the team's own public syndication feed
      // (unlike Google News RSS, whose terms restrict use to personal,
      // non-commercial feed readers — deliberately not using that source).
      name: "team-rss.xml",
      url: "https://www.patriots.com/rss/news",
    },
  ];

  if (nextGame) {
    sources.push({
      // League-wide scoreboard for the SPECIFIC upcoming week — used for
      // the real betting line (spread/over-under), which ESPN's public
      // scoreboard carries. Without &week=, this defaults to the current
      // (often already-played) week, not the one we actually want.
      name: "espn-scoreboard.json",
      url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${nextGame.week}&seasontype=2`,
    });
  }

  if (opponent && ESPN_TEAM_ID[opponent]) {
    sources.push({
      name: "espn-opponent-roster.json",
      url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${ESPN_TEAM_ID[opponent]}/roster`,
    });
  } else {
    console.warn("Warning: could not determine next opponent, skipping opponent roster fetch.");
  }

  for (const { name, url } of sources) {
    try {
      await fetchOne(name, url);
    } catch (err) {
      // Don't let one bad ESPN endpoint take down the whole refresh — the
      // normalize step will fall back to whatever raw JSON already exists
      // on disk from the last successful fetch.
      console.error(`Warning: ${name} fetch failed, keeping last-good copy.`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
