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
// Run after: build-espn-data.ts (needs league-news.json, already
// fantasy-filtered there)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateJson } from "./lib/claude";
import type { NewsItem } from "../lib/data/types";

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const KEEP_COUNT = 6;

const SYSTEM = `You are a world-class NFL editor and analyst — the kind of person who instantly knows which stories are genuinely significant (major injuries, trades, suspensions, coaching changes, big on-field performances, real controversies) versus routine noise (minor roster moves, generic analysis pieces, press-release-style updates, or anything not actually a big story). Exclude anything fantasy-football-flavored even if it doesn't say "fantasy" outright — start/sit calls, "Week N preview" pieces on individual skill-position players, or commentary from known fantasy analysts (e.g. Field Yates, Mike Clay) belong to fantasy content, not real news, and should be excluded. Given a numbered list of real headlines, select ONLY the ${KEEP_COUNT} most genuinely newsworthy ones that a serious, plugged-in NFL fan would actually want to see — skip anything minor, routine, fantasy-flavored, or filler, even if that means selecting fewer than ${KEEP_COUNT}. Respond with ONLY valid JSON, no markdown formatting, no commentary: {"selectedIds": ["id1", "id2", ...]} — the chosen headline ids, most significant first. Only use ids that appear in the list below; never invent one.`;

async function main() {
  let news: NewsItem[];
  try {
    news = JSON.parse(await readFile(path.join(GENERATED_DIR, "league-news.json"), "utf-8"));
  } catch {
    console.log("league-news.json not found — skipping curation.");
    return;
  }

  if (news.length === 0) {
    console.log("No league news to curate.");
    return;
  }

  const candidates = news.slice(0, 25); // cap prompt size — recent items are already sorted first
  const user = `Real headlines to choose from:
${candidates.map((n) => `- id "${n.id}": [${n.type}] ${n.headline}: ${n.summary}`).join("\n")}

Select the ${KEEP_COUNT} most significant now.`;

  const result = await generateJson<{ selectedIds: string[] }>(SYSTEM, user, 300);

  if (!result?.selectedIds?.length) {
    console.log("Curation failed or returned nothing — falling back to the most recent non-fantasy headlines.");
    const fallback = news.slice(0, KEEP_COUNT);
    await writeFile(path.join(GENERATED_DIR, "league-news.json"), JSON.stringify(fallback, null, 2));
    return;
  }

  const byId = new Map(candidates.map((n) => [n.id, n]));
  const curated = result.selectedIds
    .map((id) => byId.get(id))
    .filter((n): n is NewsItem => Boolean(n))
    .slice(0, KEEP_COUNT);

  if (curated.length === 0) {
    console.log("Curation returned no valid ids — falling back to the most recent non-fantasy headlines.");
    const fallback = news.slice(0, KEEP_COUNT);
    await writeFile(path.join(GENERATED_DIR, "league-news.json"), JSON.stringify(fallback, null, 2));
    return;
  }

  await writeFile(path.join(GENERATED_DIR, "league-news.json"), JSON.stringify(curated, null, 2));
  console.log(`Curated league-news.json down to ${curated.length} significant stories (from ${news.length} candidates).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(0);
});
