// Builds a short "what beat writers are saying" digest from real,
// already-fetched news headlines — synthesizes, never invents. Runs on
// the headlines cadence (news changes continuously, unlike stats), reading
// whatever build-espn-data.ts just wrote to news.json.
//
// Run after: build-espn-data.ts

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateText } from "./lib/claude";
import type { BeatDigest, NewsItem } from "../lib/data/types";

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

const SYSTEM = `You write for The Foxboro Beacon, an independent New England Patriots fan site. Write in the voice of a die-hard, opinionated Patriots fan summarizing what beat writers and reporters are saying about the team this week — invested and a little opinionated, but never mean-spirited or vulgar. Use ONLY the headlines and summaries given to you below — never invent facts, quotes, or events beyond them. Be specific: name the actual players, positions, and events involved (e.g. "Wallace's ankle" not "a key injury", "the new DT signing" not "a roster move") rather than describing things generically — specificity is more important than covering every headline. Write 3-4 sentences, one flowing paragraph, no bullet points, no headers, no preamble like "Here's a summary" — just the paragraph itself.`;

async function main() {
  let news: NewsItem[];
  try {
    news = JSON.parse(await readFile(path.join(GENERATED_DIR, "news.json"), "utf-8"));
  } catch {
    console.log("news.json not found — skipping beat digest.");
    return;
  }

  const recent = news.slice(0, 10);
  if (recent.length === 0) {
    console.log("No news items available — skipping beat digest.");
    return;
  }

  const user = `This week's real headlines:
${recent.map((n) => `- [${n.type}] ${n.headline}: ${n.summary}`).join("\n")}

Write the digest paragraph now.`;

  const text = await generateText(SYSTEM, user, 300);
  if (!text) {
    console.log("Beat digest generation failed — leaving previous digest (if any) in place.");
    return;
  }

  const digest: BeatDigest = { text, asOf: new Date().toISOString() };
  await writeFile(path.join(GENERATED_DIR, "beat-digest.json"), JSON.stringify(digest, null, 2));
  console.log("Wrote beat-digest.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(0);
});
