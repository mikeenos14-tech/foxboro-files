// Is the site's data actually current? verify-data.ts checks that numbers
// are right; this checks that they're recent — the failure it can't see.
//
//   1. Every outside source was fetched successfully within its limit.
//      A job's fetch steps carry on when one source fails, and in the
//      automated jobs there's no saved copy to fall back to, so without
//      this a source can fail for days while every run reports success.
//   2. Every New England game that finished more than 30 hours ago has a
//      result, a recap and its plays — "the run succeeded" isn't "the site
//      updated" when nflverse publishes late.
//   3. The upcoming game isn't one that's already been played.
//
// Age limits apply in season only (September to mid-February).
//
// Run: npx tsx scripts/check-freshness.ts --job stats|headlines|all
// Exits non-zero when anything is stale, so the job shows as failed.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv } from "./lib/csv";
import { readSourceStatus, type SourceStatus } from "./lib/sourceStatus";

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const TEAM = "NE";
const SEASON = "2026";

// How often each job runs, with slack: headlines every 3 hours, stats at
// least daily. A source is fresh if any job that fetches it succeeded
// within that job's limit.
const JOB_LIMIT_HOURS: Record<string, number> = { headlines: 12, stats: 36 };

export function inSeason(now = new Date()): boolean {
  const m = now.getUTCMonth(); // 0 = January
  return m >= 8 || m === 0 || (m === 1 && now.getUTCDate() <= 15);
}

const hoursSince = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / 3_600_000;

export function staleSources(statusByJob: Record<string, SourceStatus>, now = new Date()): string[] {
  const sources = new Set(Object.values(statusByJob).flatMap((s) => Object.keys(s)));
  const problems: string[] = [];
  for (const source of [...sources].sort()) {
    const fresh = Object.entries(statusByJob).some(([job, status]) => {
      const s = status[source];
      return s?.lastSuccess !== undefined && hoursSince(s.lastSuccess, now) <= (JOB_LIMIT_HOURS[job] ?? 36);
    });
    if (fresh) continue;
    const successes = Object.values(statusByJob)
      .map((s) => s[source]?.lastSuccess)
      .filter((x): x is string => !!x)
      .sort();
    const last = successes.pop();
    const error = Object.values(statusByJob).map((s) => s[source]?.lastError).find(Boolean);
    problems.push(
      `${source}: last fetched ${last ? `${Math.round(hoursSince(last, now))} hours ago` : "never"}${error ? ` — latest error: ${error}` : ""}`
    );
  }
  return problems;
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path.join(GENERATED_DIR, file), "utf-8")) as T;
  } catch {
    return null;
  }
}

export async function missingGameData(now = new Date()): Promise<string[]> {
  let games: Array<Record<string, string>>;
  try {
    games = await loadCsv<Record<string, string>>("games.csv");
  } catch {
    return ["games.csv isn't available, so finished games couldn't be checked for recaps"];
  }
  const schedule = (await readJson<Array<{ gameId: string; result?: string }>>("schedule.json")) ?? [];
  const problems: string[] = [];
  for (const g of games) {
    if (g.season !== SEASON || g.game_type !== "REG" || (g.home_team !== TEAM && g.away_team !== TEAM)) continue;
    if (g.home_score === "" || g.home_score === "NA") continue;
    // gametime is Eastern; -04:00 is close enough for a 30-hour window.
    const kickoff = new Date(`${g.gameday}T${g.gametime || "13:00"}:00-04:00`);
    if (hoursSince(kickoff.toISOString(), now) < 30) continue;
    const missing: string[] = [];
    if (!schedule.find((r) => r.gameId === g.game_id)?.result) missing.push("result");
    if (!(await readJson(`recap-${g.game_id}.json`))) missing.push("recap");
    if (!(await readJson(`plays-${g.game_id}.json`))) missing.push("plays");
    if (missing.length > 0) problems.push(`Week ${g.week} (${g.game_id}) finished over 30 hours ago but has no ${missing.join(", ")}`);
  }
  const next = await readJson<{ id: string; date: string }>("next-game.json");
  if (next && hoursSince(`${next.date}T23:59:00-04:00`, now) > 24) {
    problems.push(`The "next game" is ${next.id}, played on ${next.date}`);
  }
  return problems;
}

export async function checkFreshness(jobs: string[], now = new Date()): Promise<string[]> {
  if (!inSeason(now)) return [];
  const statusByJob: Record<string, SourceStatus> = {};
  for (const job of jobs) statusByJob[job] = await readSourceStatus(job);
  const problems = staleSources(statusByJob, now);
  // Game completeness needs games.csv, which the stats job fetches (and
  // the health job fetches for this); the headlines job doesn't.
  if (jobs.includes("stats")) problems.push(...(await missingGameData(now)));
  return problems;
}

async function main() {
  const arg = process.argv[process.argv.indexOf("--job") + 1] ?? "all";
  const jobs = arg === "all" ? ["stats", "headlines"] : [arg];
  const problems = await checkFreshness(jobs);
  if (problems.length > 0) {
    console.error("✖ Stale data:");
    for (const p of problems) console.error(`   - ${p}`);
    process.exit(1);
  }
  console.log(`✓ Data is current (${jobs.join(", ")}).`);
}

if (process.argv[1]?.endsWith("check-freshness.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
