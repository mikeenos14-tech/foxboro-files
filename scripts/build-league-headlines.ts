// Curates the Around the League headlines down to the 5-6 stories that
// actually matter, using the Claude API to make an editorial judgment
// call — not a popularity metric (ESPN doesn't expose real view/click
// data for free, and the free alternatives we checked either don't exist
// anymore or need real API registration), but a stand-in for one:
// "which of these real headlines would a serious NFL editor actually
// send out, versus routine noise." The model only SELECTS from real,
// already-fetched headlines — it never writes or rewrites headline text,
// so there's no risk of inventing a story that didn't happen.
//
// Candidates are pulled from the trailing calendar week (not just
// whatever's freshest right now) via build-espn-data.ts's rolling
// league-news-archive.json — ESPN's feed only ever shows a current
// snapshot, and this runs every 3 hours, so without the archive a story
// from three days ago would already be gone even if it's still the
// biggest thing going on. Near-duplicate headlines (the same story run as
// multiple takes/angles — e.g. two separate "Cowboys' defense" pieces) are
// collapsed to their most recent version before ranking, so curation
// doesn't burn slots on the same story twice.
//
// Run after: build-espn-data.ts (needs league-news-archive.json)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateJson } from "./lib/claude";
import { TEAM_NICKNAMES } from "./lib/teams";
import type { NewsItem } from "../lib/data/types";

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const KEEP_COUNT = 6;
const WINDOW_DAYS = 7;
const CANDIDATE_CAP = 40; // keep the prompt a reasonable size even in a busy week

// Loose topic-similarity dedup: headlines that share most of their
// meaningful words are almost always the same underlying story told a
// different way, not two distinct pieces of news (e.g. two separate ESPN
// pieces both about "the Cowboys' defense"). Team nicknames get special
// handling below — "Cowboys" alone isn't a very distinctive word to match
// on generically (it says nothing about which story), but two headlines
// both naming the same team are far more likely to be the same story than
// two random headlines sharing any other single word, so that pairing gets
// a much lower bar than the general case.
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "what", "why", "how", "who",
  "about", "for", "in", "on", "to", "of", "and", "or", "vs", "its", "it's",
  "this", "that", "with", "from", "as", "be", "by", "at", "up", "out",
]);

const NICKNAMES = new Set(Object.values(TEAM_NICKNAMES));

function significantWords(text: string): Set<string> {
  // Apostrophes are stripped (not just non-alphanumerics) so a possessive
  // team reference like "Cowboys'" normalizes to "cowboys" and matches
  // TEAM_NICKNAMES — ESPN headlines almost always phrase it that way
  // ("Cowboys' defense," "Colts' Keenan Allen").
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function mentionedTeams(words: Set<string>): Set<string> {
  return new Set([...words].filter((w) => NICKNAMES.has(w)));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((w) => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

const SAME_TEAM_DUPLICATE_THRESHOLD = 0.15;
const GENERAL_DUPLICATE_THRESHOLD = 0.45;

// Input should already be sorted newest-first — the first (most recent)
// item in a duplicate cluster is the one kept.
function dedupeNearDuplicates(items: NewsItem[]): NewsItem[] {
  const kept: Array<{ item: NewsItem; words: Set<string>; teams: Set<string> }> = [];
  for (const item of items) {
    const words = significantWords(item.headline);
    const teams = mentionedTeams(words);
    const isDuplicate = kept.some((k) => {
      const sharesTeam = [...teams].some((t) => k.teams.has(t));
      const threshold = sharesTeam ? SAME_TEAM_DUPLICATE_THRESHOLD : GENERAL_DUPLICATE_THRESHOLD;
      return jaccardSimilarity(k.words, words) >= threshold;
    });
    if (!isDuplicate) kept.push({ item, words, teams });
  }
  return kept.map((k) => k.item);
}

const SYSTEM = `You are a world-class NFL editor building the "Around the League" module for a serious fan site — a ranked list of what's worth knowing about right now, not a breaking-news wire. It legitimately includes real analysis, commentary, and storylines from real NFL media (not just trades/injuries/suspensions), the same way a good "around the league" column would.

Step 1 — exclude, absolutely and without exception: fantasy-football content, even when it doesn't say "fantasy" outright. This means start/sit calls, ANY "Week N preview"/"Week N outlook" piece built around a single skill-position player (these exist purely to inform a fantasy start/sit or waiver decision — exclude every one of them, no matter how well-known the player), and commentary from known fantasy analysts (e.g. Field Yates, Mike Clay). This rule is never relaxed to hit a target count — a fantasy-flavored piece is never an acceptable id to return, even as a last-resort filler.

Step 2 — everything else about real NFL teams, players, coaches, and games is in-bounds, including opinion/analysis pieces (e.g. a real analyst questioning a defense, a real "can this team bounce back" storyline) and real feature pieces. Those are legitimate "around the league" content, not noise — don't exclude a real, non-fantasy story just because it's commentary/analysis rather than a hard transaction.

From the headlines that survive Step 1, RANK ALL of them by how interesting/significant they'd be to a serious, plugged-in NFL fan — major injuries, trades, suspensions, coaching moves, and big performances rank highest; real analysis, storylines, and features rank lower but still belong on the list. Then return exactly ${KEEP_COUNT} ids, most significant first. Return FEWER than ${KEEP_COUNT} ONLY when Step 1 leaves fewer than ${KEEP_COUNT} surviving headlines in total — in that case return all of them and stop; never substitute a Step-1-excluded fantasy piece to pad the count back up.

Respond with ONLY valid JSON, no markdown formatting, no commentary: {"selectedIds": ["id1", "id2", ...]} — the chosen headline ids, most significant first. Only use ids that appear in the list below; never invent one.`;

async function main() {
  let archive: NewsItem[];
  try {
    archive = JSON.parse(
      await readFile(path.join(GENERATED_DIR, "league-news-archive.json"), "utf-8")
    );
  } catch {
    console.log("league-news-archive.json not found — skipping curation.");
    return;
  }

  const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const withinWeek = archive
    .filter((n) => new Date(n.publishedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  if (withinWeek.length === 0) {
    console.log("No league news within the trailing week to curate.");
    return;
  }

  const deduped = dedupeNearDuplicates(withinWeek);
  const candidates = deduped.slice(0, CANDIDATE_CAP);
  console.log(
    `${archive.length} archived stories -> ${withinWeek.length} within ${WINDOW_DAYS} days -> ${deduped.length} after near-duplicate dedup -> ${candidates.length} sent to curation.`
  );

  const user = `Real headlines to choose from:
${candidates.map((n) => `- id "${n.id}": [${n.type}] ${n.headline}: ${n.summary}`).join("\n")}

Rank and select the top ${KEEP_COUNT} now.`;

  const result = await generateJson<{ selectedIds: string[] }>(SYSTEM, user, 300);

  if (!result?.selectedIds?.length) {
    console.log("Curation failed or returned nothing — falling back to the most recent deduped headlines.");
    const fallback = candidates.slice(0, KEEP_COUNT);
    await writeFile(path.join(GENERATED_DIR, "league-news.json"), JSON.stringify(fallback, null, 2));
    return;
  }

  const byId = new Map(candidates.map((n) => [n.id, n]));
  const curated = result.selectedIds
    .map((id) => byId.get(id))
    .filter((n): n is NewsItem => Boolean(n))
    .slice(0, KEEP_COUNT);

  if (curated.length === 0) {
    console.log("Curation returned no valid ids — falling back to the most recent deduped headlines.");
    const fallback = candidates.slice(0, KEEP_COUNT);
    await writeFile(path.join(GENERATED_DIR, "league-news.json"), JSON.stringify(fallback, null, 2));
    return;
  }

  await writeFile(path.join(GENERATED_DIR, "league-news.json"), JSON.stringify(curated, null, 2));
  console.log(`Curated league-news.json down to ${curated.length} significant stories (from ${candidates.length} candidates).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(0);
});
