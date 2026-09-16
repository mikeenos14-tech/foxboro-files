// Normalizes data/raw/{espn-*.json, team-rss.xml} (fetched by
// fetch-news-sources.ts) into data/generated/news.json and
// data/generated/injuries.json, merging ESPN and the official team RSS
// feed into one deduped, sorted news list.
//
// Resilience: ESPN's endpoints are undocumented and can change shape
// without notice. Every read here is defensive (optional chaining +
// fallbacks), and if a raw file is missing or malformed we log and leave
// the previously-generated JSON in place rather than overwrite it with
// something broken or empty.
//
// Run with: npx tsx scripts/build-espn-data.ts
// (after: npx tsx scripts/fetch-news-sources.ts)

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { loadCsv, num } from "./lib/csv";
import type { Game, InjuryReportEntry, NewsItem, NewsType } from "../lib/data/types";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const TEAM_NAME_KEYWORDS = ["patriots"];
const TEAM = "NE";

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
  if (/injur|questionable|doubtful|\bout\b|\bir\b/.test(text)) return "Injury";
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

async function buildLeagueNews(): Promise<NewsItem[] | null> {
  const raw = await readRawJson<EspnNewsResponse>("espn-league-news.json");
  if (!raw?.articles) return null;

  return raw.articles.map((a) => {
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

// ---------- Official team RSS ----------

interface RssItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  guid?: { "#text"?: string } | string;
  "media:keywords"?: string;
}

function classifyFromKeywords(keywords: string, headline: string, description: string): NewsType {
  const kw = keywords.toLowerCase();
  if (kw.includes("transaction")) return "Transaction";
  if (kw.includes("injur")) return "Injury";
  return classify(headline, description);
}

async function buildTeamRssNews(): Promise<NewsItem[] | null> {
  let xml: string;
  try {
    xml = await readFile(path.join(RAW_DIR, "team-rss.xml"), "utf-8");
  } catch (err) {
    console.error("Warning: could not read team-rss.xml, skipping this source.", err);
    return null;
  }

  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item;
    const items: RssItem[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items.map((item, i) => {
      const headline = String(item.title ?? "Untitled").trim();
      const summary = String(item.description ?? "").trim();
      const keywords = String(item["media:keywords"] ?? "").trim();
      const guid = typeof item.guid === "string" ? item.guid : item.guid?.["#text"];
      return {
        id: guid ?? `rss-${i}`,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        type: classifyFromKeywords(keywords, headline, summary),
        headline,
        summary,
        sourceUrl: item.link ?? "https://www.patriots.com/news/",
        sourceName: "Patriots.com",
      } satisfies NewsItem;
    });
  } catch (err) {
    console.error("Warning: could not parse team-rss.xml, skipping this source.", err);
    return null;
  }
}

// Merge ESPN + official RSS, deduping stories both sources covered (compared
// by a normalized headline) and sorting newest-first.
function mergeNews(sources: NewsItem[][]): NewsItem[] {
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const items of sources) {
    for (const item of items) {
      const key = item.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
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

async function readNextGame(): Promise<Game | null> {
  try {
    const content = await readFile(
      path.join(GENERATED_DIR, "next-game.json"),
      "utf-8"
    );
    return JSON.parse(content) as Game;
  } catch {
    return null;
  }
}

async function currentWeek(): Promise<number> {
  const game = await readNextGame();
  return game?.week ?? 0;
}

async function nextGameOpponent(): Promise<string | null> {
  const game = await readNextGame();
  if (!game) return null;
  return game.homeTeam === TEAM ? game.awayTeam : game.homeTeam;
}

async function buildInjuriesFromEspn(
  rosterFile: string,
  week: number
): Promise<InjuryReportEntry[] | null> {
  const raw = await readRawJson<EspnRosterResponse>(rosterFile);
  if (!raw?.athletes) return null;

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
      // (Wed/Thu/Fri) practice participation, only an overall status — used
      // as a live-ish fallback for whichever week nflverse's official
      // report hasn't published yet.
      gameStatus: mapGameStatus(injury.status ?? ""),
      lastUpdated: injury.date ?? new Date().toISOString(),
    });
  }
  return entries;
}

// nflverse's official, team-reported weekly injury data — preferred over
// ESPN when it has the target week published, since it's the real league
// report (practice participation + official game status + actual injury
// body part), not a live roster-status guess.
interface NflverseInjuryRow {
  season: string;
  team: string;
  week: string;
  gsis_id: string;
  position: string;
  full_name: string;
  report_primary_injury: string;
  report_status: string;
  practice_primary_injury: string;
  practice_status: string;
}

function mapPracticeStatus(raw: string): InjuryReportEntry["practiceStatus"] {
  if (raw === "Did Not Participate In Practice") return "Did Not Participate";
  if (raw === "Limited Participation in Practice") return "Limited";
  if (raw === "Full Participation in Practice") return "Full";
  return undefined;
}

function mapNflverseGameStatus(raw: string): InjuryReportEntry["gameStatus"] {
  if (raw === "Questionable" || raw === "Doubtful" || raw === "Out") return raw;
  return null;
}

async function buildInjuriesFromNflverse(
  team: string,
  week: number
): Promise<InjuryReportEntry[] | null> {
  let rows: NflverseInjuryRow[];
  try {
    rows = await loadCsv<NflverseInjuryRow>("injuries_2026.csv");
  } catch (err) {
    console.error("Warning: could not read injuries_2026.csv, skipping this source.", err);
    return null;
  }

  const targetRows = rows.filter((r) => r.team === team && num(r.week) === week);
  if (targetRows.length === 0) return null;

  return targetRows.map((r) => ({
    playerId: r.gsis_id,
    playerName: r.full_name,
    position: r.position,
    week,
    injury: r.report_primary_injury || r.practice_primary_injury || "Not specified",
    practiceStatus: mapPracticeStatus(r.practice_status),
    gameStatus: mapNflverseGameStatus(r.report_status),
    lastUpdated: new Date().toISOString(),
  }));
}

async function main() {
  const espnNews = await buildNews();
  const rssNews = await buildTeamRssNews();

  if (espnNews || rssNews) {
    const news = mergeNews([rssNews ?? [], espnNews ?? []]);
    await writeFile(path.join(GENERATED_DIR, "news.json"), JSON.stringify(news, null, 2));
    console.log(
      `Wrote news.json (${news.length} stories: ${rssNews?.length ?? 0} from Patriots.com, ${espnNews?.length ?? 0} from ESPN, deduped)`
    );
  } else {
    console.warn("news.json not updated — kept previous version, if any.");
  }

  const leagueNews = await buildLeagueNews();
  if (leagueNews) {
    await writeFile(
      path.join(GENERATED_DIR, "league-news.json"),
      JSON.stringify(leagueNews, null, 2)
    );
    console.log(`Wrote league-news.json (${leagueNews.length} stories)`);
  } else {
    console.warn("league-news.json not updated — kept previous version, if any.");
  }

  const week = await currentWeek();

  const nflverseInjuries = await buildInjuriesFromNflverse(TEAM, week);
  const injuries = nflverseInjuries ?? (await buildInjuriesFromEspn("espn-roster.json", week));
  if (injuries) {
    await writeFile(
      path.join(GENERATED_DIR, "injuries.json"),
      JSON.stringify(injuries, null, 2)
    );
    console.log(
      `Wrote injuries.json (${injuries.length} entries for week ${week}, source: ${nflverseInjuries ? "nflverse" : "ESPN fallback"})`
    );
  } else {
    console.warn("injuries.json not updated — kept previous version, if any.");
  }

  const opponent = await nextGameOpponent();
  if (opponent) {
    const nflverseOppInjuries = await buildInjuriesFromNflverse(opponent, week);
    const oppInjuries =
      nflverseOppInjuries ?? (await buildInjuriesFromEspn("espn-opponent-roster.json", week));
    if (oppInjuries) {
      await writeFile(
        path.join(GENERATED_DIR, "opponent-injuries.json"),
        JSON.stringify(oppInjuries, null, 2)
      );
      console.log(
        `Wrote opponent-injuries.json (${oppInjuries.length} entries for ${opponent}, source: ${nflverseOppInjuries ? "nflverse" : "ESPN fallback"})`
      );
    } else {
      console.warn("opponent-injuries.json not updated — kept previous version, if any.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
