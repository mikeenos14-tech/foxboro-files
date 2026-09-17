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
import { buildLeagueRosterByGsis, type RosterRow } from "./lib/roster";
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

// Fantasy content isn't "around the league" news in the sense this section
// means — it's a different, deterministic exclusion, applied the same way
// to every league-news source, not something that needs the AI curation
// step below to judge.
function isFantasyFlavored(headline: string, description: string): boolean {
  return /fantasy/i.test(`${headline} ${description}`);
}

async function buildLeagueNews(): Promise<NewsItem[] | null> {
  const raw = await readRawJson<EspnNewsResponse>("espn-league-news.json");
  if (!raw?.articles) return null;

  const nonFantasy = raw.articles.filter(
    (a) => !isFantasyFlavored(a.headline ?? "", a.description ?? "")
  );

  return nonFantasy.map((a) => {
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

// ESPN's league news endpoint only ever returns a snapshot of the
// current/recent feed (whatever's freshest right now), and this job runs
// every 3 hours — so instead of overwriting league-news.json outright each
// time (which would make "today" the only news the curation step could ever
// see), fresh items get merged into a rolling archive keyed by ESPN's
// article id. build-league-headlines.ts reads this archive and windows it
// to the trailing calendar week itself; pruning here just keeps the archive
// file from growing forever (comfortably wider than that week-long window
// so a missed run can't quietly drop real candidates).
const ARCHIVE_MAX_AGE_DAYS = 14;

async function mergeLeagueNewsArchive(freshItems: NewsItem[]): Promise<NewsItem[]> {
  const archivePath = path.join(GENERATED_DIR, "league-news-archive.json");
  let existing: NewsItem[] = [];
  try {
    existing = JSON.parse(await readFile(archivePath, "utf-8"));
  } catch {
    existing = [];
  }

  // Fresh data always overwrites an existing entry with the same id (rather
  // than keeping whichever was archived first) — a source can correct a
  // headline after publish, and this is also what lets a parsing fix (e.g.
  // the entity-decoding one below) actually reach already-archived stories
  // instead of leaving a stale, wrongly-parsed copy stuck for the rest of
  // the archive's 14-day retention.
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of freshItems) {
    byId.set(item.id, item);
  }

  const cutoff = Date.now() - ARCHIVE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const merged = [...byId.values()]
    .filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  await writeFile(archivePath, JSON.stringify(merged, null, 2));
  return merged;
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

async function parseRssItems(filename: string): Promise<RssItem[] | null> {
  let xml: string;
  try {
    xml = await readFile(path.join(RAW_DIR, filename), "utf-8");
  } catch (err) {
    console.error(`Warning: could not read ${filename}, skipping this source.`, err);
    return null;
  }

  try {
    // htmlEntities: true — without it, numeric/named character references
    // in headline text (e.g. "&#8217;" for a curly apostrophe, common in
    // WordPress-generated feeds like PFR/PFT) are left un-decoded and show
    // up literally on the page instead of as the actual character.
    const parser = new XMLParser({ ignoreAttributes: false, htmlEntities: true });
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item;
    return Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  } catch (err) {
    console.error(`Warning: could not parse ${filename}, skipping this source.`, err);
    return null;
  }
}

// fast-xml-parser's htmlEntities option decodes character references in
// plain XML text nodes, but never inside a CDATA section — CDATA content is
// literal by the XML spec, on any conformant parser. WordPress-generated
// feeds (PFR, PFT) wrap <description> in CDATA but still HTML-entity-encode
// punctuation inside it (e.g. "&#8217;" for a curly apostrophe), so that
// text needs a second, manual decode pass after parsing.
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: " ", hellip: "…", mdash: "—", ndash: "–",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_HTML_ENTITIES[name] ?? match);
}

async function buildTeamRssNews(): Promise<NewsItem[] | null> {
  const items = await parseRssItems("team-rss.xml");
  if (!items) return null;

  return items.map((item, i) => {
    const headline = decodeHtmlEntities(String(item.title ?? "Untitled").trim());
    const summary = decodeHtmlEntities(String(item.description ?? "").trim());
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
}

// Pro Football Rumors and Pro Football Talk — free, keyless RSS feeds that
// broaden the Around the League candidate pool beyond ESPN's single feed
// (checked by hand: both are real transactions/injuries/insider-news
// content, no fantasy-football material observed). Same fantasy exclusion
// applies here as everywhere else in league news, for consistency, even
// though neither source seems to run that kind of content.
async function buildRssLeagueNews(
  filename: string,
  sourceName: string,
  fallbackUrl: string
): Promise<NewsItem[] | null> {
  const items = await parseRssItems(filename);
  if (!items) return null;

  const idPrefix = sourceName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return items
    .filter((item) => !isFantasyFlavored(String(item.title ?? ""), String(item.description ?? "")))
    .map((item, i) => {
      const headline = decodeHtmlEntities(String(item.title ?? "Untitled").trim());
      const summary = decodeHtmlEntities(String(item.description ?? "").trim());
      const guid = typeof item.guid === "string" ? item.guid : item.guid?.["#text"];
      return {
        id: `${idPrefix}-${guid ?? i}`,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        type: classify(headline, summary),
        headline,
        summary,
        sourceUrl: item.link ?? fallbackUrl,
        sourceName,
      } satisfies NewsItem;
    });
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

// patriots.com's own weekly report (parsed by build-patriots-injury-report.ts)
// covers both teams and is the freshest available source for practice
// status specifically — nflverse mirrors the same official report but only
// on its own release cadence, so during game week it can lag the team's
// own site by a day or more; ESPN's public endpoints never carry practice
// status at all. This overlays that fresher data onto whichever base list
// (nflverse or ESPN) was already built, and adds any player patriots.com
// flags that the base list missed entirely — real during Wed/Thu, when a
// merely-limited player often has no game-status designation yet for
// ESPN's live-status feed to have picked up.
interface PatriotsPracticeReport {
  week: number;
  asOf: string;
  players: Array<{
    team: string;
    playerName: string;
    position: string;
    injury: string;
    practiceStatus: InjuryReportEntry["practiceStatus"];
    gameStatus?: "Out" | "Doubtful" | "Questionable" | "Probable";
  }>;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function applyPatriotsPracticeReport(
  entries: InjuryReportEntry[],
  team: string,
  week: number
): Promise<InjuryReportEntry[]> {
  let report: PatriotsPracticeReport;
  try {
    const content = await readFile(
      path.join(GENERATED_DIR, "patriots-practice-report.json"),
      "utf-8"
    );
    report = JSON.parse(content) as PatriotsPracticeReport;
  } catch {
    return entries;
  }
  if (report.week !== week) return entries;

  const teamPlayers = report.players.filter((p) => p.team === team);
  if (teamPlayers.length === 0) return entries;

  const byName = new Map(teamPlayers.map((p) => [normalizeName(p.playerName), p]));
  const merged = entries.map((e) => {
    const match = byName.get(normalizeName(e.playerName));
    if (!match) return e;
    byName.delete(normalizeName(e.playerName));
    return {
      ...e,
      practiceStatus: match.practiceStatus,
      gameStatus: match.gameStatus ?? e.gameStatus,
      lastUpdated: report.asOf,
    };
  });

  // Anything left in byName is a player patriots.com flagged that the base
  // source didn't have at all — add them so real signal isn't dropped just
  // because ESPN hadn't assigned a game-status designation yet.
  //
  // roster_2026.csv isn't fetched by every workflow that runs this script
  // — refresh-headlines.yml deliberately only pulls the small,
  // fast-changing injuries CSV every 3 hours, not the much larger roster
  // file (see fetch-nflverse.ts) — so it may genuinely not exist on disk
  // here. loadCsv has no fallback of its own for a missing file, so this
  // is wrapped: better to add these players with a synthetic id (still
  // real data) than let a missing, unrelated CSV crash the whole script
  // and silently skip writing injuries.json entirely (the actual root
  // cause of the practice-report merge never showing up in production).
  if (byName.size > 0) {
    let rosterByName = new Map<string, RosterRow>();
    try {
      const rosterByGsis = await buildLeagueRosterByGsis();
      rosterByName = new Map(
        [...rosterByGsis.values()]
          .filter((r) => r.team === team)
          .map((r) => [normalizeName(r.full_name), r])
      );
    } catch (err) {
      console.warn("Could not load roster_2026.csv for id/position lookup — adding players without it.", err);
    }
    for (const p of byName.values()) {
      const rosterMatch = rosterByName.get(normalizeName(p.playerName));
      merged.push({
        playerId: rosterMatch?.gsis_id ?? `patriots-${normalizeName(p.playerName).replace(/ /g, "-")}`,
        playerName: p.playerName,
        position: p.position || rosterMatch?.position || "",
        week,
        injury: p.injury,
        practiceStatus: p.practiceStatus,
        gameStatus: p.gameStatus ?? null,
        lastUpdated: report.asOf,
      });
    }
  }

  return merged;
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

  const espnLeagueNews = await buildLeagueNews();
  const pfrNews = await buildRssLeagueNews(
    "pfr-league-news.xml",
    "Pro Football Rumors",
    "https://www.profootballrumors.com/"
  );
  const pftNews = await buildRssLeagueNews(
    "pft-league-news.xml",
    "Pro Football Talk",
    "https://www.nbcsports.com/profootballtalk"
  );
  const fetchedLeagueNews = mergeNews([espnLeagueNews ?? [], pfrNews ?? [], pftNews ?? []]);
  if (fetchedLeagueNews.length > 0) {
    const archive = await mergeLeagueNewsArchive(fetchedLeagueNews);
    console.log(
      `Merged ${fetchedLeagueNews.length} fetched stories (ESPN: ${espnLeagueNews?.length ?? 0}, PFR: ${pfrNews?.length ?? 0}, PFT: ${pftNews?.length ?? 0}, deduped) into league-news-archive.json (${archive.length} stories within ${ARCHIVE_MAX_AGE_DAYS} days). scripts/build-league-headlines.ts curates the calendar-week window from here into league-news.json.`
    );
  } else {
    console.warn("league-news-archive.json not updated this run — kept previous version, if any.");
  }

  const week = await currentWeek();

  const nflverseInjuries = await buildInjuriesFromNflverse(TEAM, week);
  const baseInjuries = nflverseInjuries ?? (await buildInjuriesFromEspn("espn-roster.json", week));
  if (baseInjuries) {
    const injuries = await applyPatriotsPracticeReport(baseInjuries, TEAM, week);
    await writeFile(
      path.join(GENERATED_DIR, "injuries.json"),
      JSON.stringify(injuries, null, 2)
    );
    console.log(
      `Wrote injuries.json (${injuries.length} entries for week ${week}, source: ${nflverseInjuries ? "nflverse" : "ESPN fallback"}, patriots.com practice-report merged where matched)`
    );
  } else {
    console.warn("injuries.json not updated — kept previous version, if any.");
  }

  const opponent = await nextGameOpponent();
  if (opponent) {
    const nflverseOppInjuries = await buildInjuriesFromNflverse(opponent, week);
    const baseOppInjuries =
      nflverseOppInjuries ?? (await buildInjuriesFromEspn("espn-opponent-roster.json", week));
    if (baseOppInjuries) {
      const oppInjuries = await applyPatriotsPracticeReport(baseOppInjuries, opponent, week);
      await writeFile(
        path.join(GENERATED_DIR, "opponent-injuries.json"),
        JSON.stringify(oppInjuries, null, 2)
      );
      console.log(
        `Wrote opponent-injuries.json (${oppInjuries.length} entries for ${opponent}, source: ${nflverseOppInjuries ? "nflverse" : "ESPN fallback"}, patriots.com practice-report merged where matched)`
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
