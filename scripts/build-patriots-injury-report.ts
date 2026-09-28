// Parses patriots.com's own weekly injury/practice-report article (fetched
// by fetch-news-sources.ts as patriots-injury-article.html) into real
// per-player practice-participation data for BOTH teams in the upcoming
// game — the one piece of the injury report ESPN's public endpoints and
// nflverse's periodic release genuinely can't offer same-day. The team
// publishes the real Wed/Thu/Fri Did Not Participate/Limited/Full status
// as plain, cleanly structured text embedded in the article's schema.org
// JSON-LD (an "articleBody" field) — verified stable across multiple
// eras of their site (2017, 2021, and today all use the same section
// format), so this is parsing a real, longstanding template, not
// guessing at fragile markup.
//
// Parsed in code (scripts/lib/injuryArticle.ts), not by AI. The AI
// extraction this replaced returned 4 of the 16 players on the real Week 3
// report — no Jaguars at all, including one listed Doubtful — and its
// prompt pointed it at the wrong report day. If the article ever stops
// matching the template, nothing is written and the site uses the
// official nflverse / ESPN data alone.
//
// Run after: fetch-news-sources.ts (needs patriots-injury-article.html)
// Run before: build-espn-data.ts (which merges this into injuries.json /
// opponent-injuries.json)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseInjuryArticle } from "./lib/injuryArticle";
import type { Game } from "../lib/data/types";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const TEAM = "NE";

interface PracticeReportPlayer {
  team: string; // resolved to our own abbreviation, e.g. "NE"
  playerName: string;
  position: string;
  injury: string;
  practiceStatus?: "Did Not Participate" | "Limited" | "Full";
  gameStatus?: "Out" | "Doubtful" | "Questionable" | "Probable";
}

interface PracticeReport {
  week: number;
  asOf: string;
  players: PracticeReportPlayer[];
}

async function readNextGame(): Promise<Game | null> {
  try {
    const content = await readFile(path.join(GENERATED_DIR, "next-game.json"), "utf-8");
    return JSON.parse(content) as Game;
  } catch {
    return null;
  }
}

function extractArticleBody(
  html: string
): { articleBody: string; headline: string; keywords: string; dateModified: string } | null {
  // The article embeds one schema.org NewsArticle JSON-LD block. Rather
  // than parse the whole HTML document, just locate that one <script>
  // block and JSON.parse its contents directly.
  const match = html.match(
    /<script type="application\/ld\+json">(\{[^<]*"@type":"NewsArticle"[^<]*\})<\/script>/
  );
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    if (typeof data.articleBody !== "string") return null;
    return {
      articleBody: data.articleBody,
      headline: data.headline ?? "",
      keywords: Array.isArray(data.keywords) ? data.keywords.join(", ") : "",
      dateModified: data.dateModified ?? data.datePublished ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// The article's keywords field carries the real matchup/week context, e.g.
// "Pittsburgh Steelers at New England Patriots (2026-REG-2)" — pulling the
// week number from there (rather than trusting the headline's free-form
// "Week 2" text, which isn't always phrased the same way) lets us confirm
// this article is actually for the CURRENT week before trusting it.
function extractWeekFromKeywords(keywords: string): number | null {
  const match = keywords.match(/REG-(\d+)/);
  return match ? Number(match[1]) : null;
}

async function main() {
  const nextGame = await readNextGame();
  if (!nextGame) {
    console.log("No next-game.json yet — skipping patriots.com injury report parse.");
    return;
  }
  const opponent = nextGame.homeTeam === TEAM ? nextGame.awayTeam : nextGame.homeTeam;

  let html: string;
  try {
    html = await readFile(path.join(RAW_DIR, "patriots-injury-article.html"), "utf-8");
  } catch {
    console.log("patriots-injury-article.html not found — skipping.");
    return;
  }

  const article = extractArticleBody(html);
  if (!article) {
    console.warn("Could not find/parse the article's JSON-LD NewsArticle block — skipping.");
    return;
  }

  const week = extractWeekFromKeywords(article.keywords);
  if (week === null || week !== nextGame.week) {
    console.log(
      `Article's week (${week ?? "unknown"}) doesn't match the upcoming game's week (${nextGame.week}) — likely stale, skipping.`
    );
    return;
  }

  const parsed = parseInjuryArticle(article.articleBody, [TEAM, opponent]);
  if (!parsed) {
    console.warn(
      "patriots.com article didn't match the injury-report template — nothing written; nflverse/ESPN data stands alone."
    );
    return;
  }
  if (parsed.conflicts.length > 0) {
    console.warn(`Left out (listed twice with different statuses): ${parsed.conflicts.join(", ")}`);
  }
  const players: PracticeReportPlayer[] = parsed.players.map((p) => ({
    team: p.team,
    playerName: p.playerName,
    position: p.position,
    injury: p.injury,
    ...(p.practiceStatus ? { practiceStatus: p.practiceStatus } : {}),
    ...(p.gameStatus ? { gameStatus: p.gameStatus } : {}),
  }));

  const report: PracticeReport = { week, asOf: article.dateModified, players };
  await writeFile(
    path.join(GENERATED_DIR, "patriots-practice-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(
    `Wrote patriots-practice-report.json (${parsed.day}, week ${week}, ${players.length} players, ${players.filter((p) => p.team === TEAM).length} ${TEAM} / ${players.filter((p) => p.team === opponent).length} ${opponent})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(0);
});
