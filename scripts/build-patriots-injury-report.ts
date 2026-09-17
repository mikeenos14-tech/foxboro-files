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
// The AI's job here is pure extraction, never generation: given the real
// article text, pull out real facts already stated in it. It's told
// explicitly never to invent a player or a status, and every returned
// player name is verified to actually appear in the source text before
// being trusted — the same "select/extract from real text only" pattern
// already used for league headlines curation and the AI recap takes.
//
// Run after: fetch-news-sources.ts (needs patriots-injury-article.html)
// Run before: build-espn-data.ts (which merges this into injuries.json /
// opponent-injuries.json)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateJson } from "./lib/claude";
import { TEAM_NICKNAMES } from "./lib/teams";
import type { Game } from "../lib/data/types";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const TEAM = "NE";

interface ExtractedPlayer {
  team: string; // team name as written in the article, e.g. "New England Patriots"
  playerName: string;
  position: string;
  injury: string;
  practiceStatus: "Did Not Participate" | "Limited" | "Full";
  gameStatus?: "Out" | "Doubtful" | "Questionable" | "Probable";
}

interface PracticeReportPlayer {
  team: string; // resolved to our own abbreviation, e.g. "NE"
  playerName: string;
  position: string;
  injury: string;
  practiceStatus: "Did Not Participate" | "Limited" | "Full";
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

function resolveTeamAbbr(teamNameAsWritten: string, validAbbrs: string[]): string | null {
  const lower = teamNameAsWritten.toLowerCase();
  for (const abbr of validAbbrs) {
    const nickname = TEAM_NICKNAMES[abbr];
    if (nickname && lower.includes(nickname)) return abbr;
  }
  return null;
}

const SYSTEM = `You extract real facts from a real NFL team's official injury/practice report article — you never invent, guess, or infer anything not explicitly stated in the text.

The article's "articleBody" text lists one or more dated sections (e.g. WEDNESDAY, THURSDAY, FRIDAY), each repeating both teams' full practice report. Use ONLY the section for the MOST RECENT day present (the one that appears last in the text) — ignore earlier days entirely, since later reports supersede them.

For each player explicitly listed under that most-recent day's practice-participation groups (skip any group that says "No Players Listed."), extract:
- team: the team name exactly as written in that section's header (e.g. "New England Patriots")
- playerName, position, injury (the injury/reason text after the dash)
- practiceStatus: map the group heading to exactly one of "Did Not Participate", "Limited", or "Full" — "Did Not Participate"/"DNP" -> "Did Not Participate"; "Limited Participation"/"Limited Availability"/"LP" -> "Limited"; "Full Participation"/"Full Availability"/"FP" -> "Full"
- gameStatus: ONLY if that same most-recent day's section also states an official game designation (Out/Doubtful/Questionable/Probable) for that player — omit this field entirely if none is stated, never guess one

Respond with ONLY valid JSON, no markdown, no commentary: {"players": [{"team": "...", "playerName": "...", "position": "...", "injury": "...", "practiceStatus": "...", "gameStatus": "..."}]} — gameStatus omitted where not stated. Every player must be one explicitly named in the text; never add a player who isn't listed.`;

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

  const user = `Real article text:\n\n${article.articleBody}`;
  const result = await generateJson<{ players: ExtractedPlayer[] }>(SYSTEM, user, 2000);
  if (!result?.players) {
    console.warn("Claude extraction failed or returned nothing — skipping.");
    return;
  }

  const validAbbrs = [TEAM, opponent];
  const bodyLower = article.articleBody.toLowerCase();
  const players: PracticeReportPlayer[] = [];
  for (const p of result.players) {
    // Verify against the source text before trusting anything the model
    // returned — the same defense-in-depth already used for headline
    // curation's id-matching, adapted here to a free-text extraction.
    if (!p.playerName || !bodyLower.includes(p.playerName.toLowerCase())) {
      console.warn(`Dropping "${p.playerName}" — not found verbatim in source text.`);
      continue;
    }
    const team = resolveTeamAbbr(p.team, validAbbrs);
    if (!team) {
      console.warn(`Dropping "${p.playerName}" — team "${p.team}" didn't resolve to ${TEAM} or ${opponent}.`);
      continue;
    }
    if (!["Did Not Participate", "Limited", "Full"].includes(p.practiceStatus)) {
      console.warn(`Dropping "${p.playerName}" — invalid practiceStatus "${p.practiceStatus}".`);
      continue;
    }
    players.push({
      team,
      playerName: p.playerName,
      position: p.position ?? "",
      injury: p.injury ?? "Not specified",
      practiceStatus: p.practiceStatus,
      ...(p.gameStatus && ["Out", "Doubtful", "Questionable", "Probable"].includes(p.gameStatus)
        ? { gameStatus: p.gameStatus }
        : {}),
    });
  }

  const report: PracticeReport = { week, asOf: article.dateModified, players };
  await writeFile(
    path.join(GENERATED_DIR, "patriots-practice-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(
    `Wrote patriots-practice-report.json (week ${week}, ${players.length} players, ${players.filter((p) => p.team === TEAM).length} ${TEAM} / ${players.filter((p) => p.team === opponent).length} ${opponent})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(0);
});
