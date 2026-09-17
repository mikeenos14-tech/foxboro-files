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
import { XMLParser } from "fast-xml-parser";
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

// patriots.com tags their weekly practice-report article (title format
// varies — "Week N Injury Report", "Patriots-Opponent Injury Report Week
// N", etc. — but the media:keywords tag "Injury Report" has stayed
// consistent) with the real Wed/Thu/Fri practice-participation detail
// (Did Not Participate/Limited/Full) that neither ESPN's public endpoints
// nor nflverse's periodic release can offer same-day — nflverse mirrors
// the official report but only refreshes on its own release cadence, so
// it can lag the team's own site by a day or more during game week.
// scripts/build-patriots-injury-report.ts parses the article this fetches.
async function fetchPatriotsInjuryArticle() {
  // Everything here — not just the network call — is wrapped in one try/
  // catch. An uncaught throw (e.g. the XML parser choking on some edge-case
  // character in whatever headline happens to be in the feed this run)
  // would otherwise reject main()'s promise and exit the whole script with
  // code 1, exactly the kind of hard failure this codebase avoids
  // everywhere else in favor of failing soft and keeping last-good data.
  try {
    let xml: string;
    try {
      xml = await readFile(path.join(RAW_DIR, "team-rss.xml"), "utf-8");
    } catch {
      console.warn("team-rss.xml not available, skipping patriots.com injury article fetch.");
      return;
    }

    interface RssItem {
      title?: string;
      link?: string;
      pubDate?: string;
      "media:keywords"?: string;
    }
    const parser = new XMLParser({ ignoreAttributes: false, htmlEntities: true });
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item;
    const items: RssItem[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    const injuryItems = items.filter((item) =>
      String(item["media:keywords"] ?? "")
        .toLowerCase()
        .includes("injury report")
    );
    if (injuryItems.length === 0) {
      console.log("No injury-report article found in this fetch of team-rss.xml.");
      return;
    }

    // Newest first, in case more than one is present (shouldn't normally
    // happen within one week, but pubDate is the honest tiebreaker either way).
    injuryItems.sort(
      (a, b) => new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime()
    );
    const link = injuryItems[0].link;
    if (!link) return;

    await fetchOne("patriots-injury-article.html", link);
  } catch (err) {
    console.error("Warning: patriots.com injury article fetch/parse failed, keeping last-good copy.", err);
  }
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
      // Same endpoint, no team filter — general league-wide news for the
      // Around the League page.
      name: "espn-league-news.json",
      url: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=20`,
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
    {
      // Pro Football Rumors — free, keyless RSS, transactions/rumors focus.
      // Verified by hand: consistently real news (signings, IR moves,
      // trade buzz), no fantasy-football content observed.
      name: "pfr-league-news.xml",
      url: "https://www.profootballrumors.com/feed",
    },
    {
      // Pro Football Talk (NBC Sports) — free, keyless RSS, broader
      // insider news (injuries, awards, business/media, investigations).
      // Also verified by hand: no fantasy-football content observed.
      name: "pft-league-news.xml",
      url: "https://www.nbcsports.com/profootballtalk.rss",
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

  await fetchPatriotsInjuryArticle();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
