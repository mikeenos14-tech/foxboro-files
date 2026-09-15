// Normalizes data/raw/espn-*.json (fetched by fetch-espn.ts) into
// data/generated/news.json and data/generated/injuries.json.
//
// Resilience: ESPN's endpoints are undocumented and can change shape
// without notice. Every read here is defensive (optional chaining +
// fallbacks), and if a raw file is missing or malformed we log and leave
// the previously-generated JSON in place rather than overwrite it with
// something broken or empty.
//
// Run with: npx tsx scripts/build-espn-data.ts
// (after: npx tsx scripts/fetch-espn.ts)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Game, InjuryReportEntry, NewsItem, NewsType } from "../lib/data/types";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const TEAM_NAME_KEYWORDS = ["patriots"];

async function readRawJson<T>(filename: string): Promise<T | null> {
  try {
    const content = await readFile(path.join(RAW_DIR, filename), "utf-8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Warning: could not read/parse ${filename}, skipping this piece.`, err);
    return null;
  }
}

// ---------- News ----------

interface EspnArticle {
  id: number;
  headline?: string;
  description?: string;
  published?: string;
  links?: { web?: { href?: string } };
}
interface EspnNewsResponse {
  articles?: EspnArticle[];
}

function classify(headline: string, description: string): NewsType {
  const text = `${headline} ${description}`.toLowerCase();
  if (/injur|questionable|doubtful|\bout\b|ir\b|injured reserve/.test(text)) return "Injury";
  if (/sign|trade|waive|release|activate|practice squad|cut\b/.test(text)) return "Transaction";
  if (/practice|camp notes|beat writer|notebook/.test(text)) return "Beat Report";
  return "Analysis";
}

async function buildNews(): Promise<NewsItem[] | null> {
  const raw = await readRawJson<EspnNewsResponse>("espn-news.json");
  if (!raw?.articles) return null;

  const relevant = raw.articles.filter((a) =>
    TEAM_NAME_KEYWORDS.some((kw) => (a.headline ?? "").toLowerCase().includes(kw))
  );

  return relevant.map((a) => {
    const headline = a.headline ?? "Untitled";
    const summary = a.description ?? "";
    return {
      id: String(a.id),
      publishedAt: a.published ?? new Date().toISOString(),
      type: classify(headline, summary),
      headline,
      summary,
      sourceUrl: a.links?.web?.href ?? "https://www.espn.com/nfl/",
      sourceName: "ESPN",
    };
  });
}

// ---------- Injuries ----------

interface EspnRosterInjury {
  status?: string;
  date?: string;
}
interface EspnRosterAthlete {
  id: string;
  fullName: string;
  position?: { abbreviation?: string };
  injuries?: EspnRosterInjury[];
}
interface EspnRosterGroup {
  items?: EspnRosterAthlete[];
}
interface EspnRosterResponse {
  athletes?: EspnRosterGroup[];
}

const CURRENT_WEEK_STATUSES = new Set(["Questionable", "Doubtful", "Out", "Probable"]);

function mapGameStatus(status: string): InjuryReportEntry["gameStatus"] {
  if (status === "Questionable") return "Questionable";
  if (status === "Doubtful") return "Doubtful";
  if (status === "Probable") return "Probable";
  if (status === "Out" || status === "Injured Reserve") return "Out";
  return null;
}

async function fetchBodyPart(athleteId: string): Promise<string> {
  try {
    const res = await fetch(
      `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/athletes/${athleteId}/injuries?lang=en&region=us`
    );
    if (!res.ok) return "Not specified";
    const data = await res.json();
    return data?.items?.[0]?.details?.type ?? "Not specified";
  } catch {
    return "Not specified";
  }
}

async function currentWeek(): Promise<number> {
  try {
    const content = await readFile(
      path.join(GENERATED_DIR, "next-game.json"),
      "utf-8"
    );
    const game = JSON.parse(content) as Game;
    return game.week;
  } catch {
    return 0;
  }
}

async function buildInjuries(): Promise<InjuryReportEntry[] | null> {
  const raw = await readRawJson<EspnRosterResponse>("espn-roster.json");
  if (!raw?.athletes) return null;
  const week = await currentWeek();

  const withInjuries = raw.athletes
    .flatMap((group) => group.items ?? [])
    .filter((p) => (p.injuries?.length ?? 0) > 0)
    .map((p) => ({ player: p, injury: p.injuries![0] }))
    .filter(({ injury }) => CURRENT_WEEK_STATUSES.has(injury.status ?? ""));

  const entries: InjuryReportEntry[] = [];
  for (const { player, injury } of withInjuries) {
    const bodyPart = await fetchBodyPart(player.id);
    entries.push({
      playerId: player.id,
      playerName: player.fullName,
      position: player.position?.abbreviation ?? "",
      week,
      injury: bodyPart,
      // ESPN's public roster/injuries endpoints don't expose day-by-day
      // (Wed/Thu/Fri) practice participation — only the current overall
      // game-status designation, which is what's populated below.
      gameStatus: mapGameStatus(injury.status ?? ""),
      lastUpdated: injury.date ?? new Date().toISOString(),
    });
  }
  return entries;
}

async function main() {
  const news = await buildNews();
  if (news) {
    await writeFile(path.join(GENERATED_DIR, "news.json"), JSON.stringify(news, null, 2));
    console.log(`Wrote news.json (${news.length} team-relevant stories)`);
  } else {
    console.warn("news.json not updated — kept previous version, if any.");
  }

  const injuries = await buildInjuries();
  if (injuries) {
    await writeFile(
      path.join(GENERATED_DIR, "injuries.json"),
      JSON.stringify(injuries, null, 2)
    );
    console.log(`Wrote injuries.json (${injuries.length} current-week entries)`);
  } else {
    console.warn("injuries.json not updated — kept previous version, if any.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
