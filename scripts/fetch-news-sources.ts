// Downloads news/injury/roster sources into data/raw/: ESPN's public
// (undocumented, no-auth) endpoints, plus the official patriots.com RSS
// feed. ESPN's endpoints are unofficial and can change without notice —
// build-espn-data.ts is written to fail soft (keep last-good generated
// JSON) rather than crash the site if a source changes shape.
// Run with: npx tsx scripts/fetch-news-sources.ts

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const TEAM_ESPN_ID = "17"; // New England Patriots — verified against the /teams list endpoint

const SOURCES: Array<{ name: string; url: string }> = [
  {
    name: "espn-news.json",
    url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?team=${TEAM_ESPN_ID}&limit=20`,
  },
  {
    name: "espn-roster.json",
    url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${TEAM_ESPN_ID}/roster`,
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
  for (const { name, url } of SOURCES) {
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
