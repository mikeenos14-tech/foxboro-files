// When each outside data source was last fetched successfully.
//
// The download steps keep going when one source fails, which is right for
// a single hiccup — but in the automated jobs the raw files aren't kept
// between runs, so a source that fails for days leaves the site quietly
// stale while every run reports success. This records each attempt so
// scripts/check-freshness.ts can say how old every source really is.
//
// One file per job (SOURCE_STATUS_JOB=stats | headlines), never shared:
// the two jobs overlap at 9:00 and 21:00 UTC, and a file both commit
// would conflict the way ai-diagnostics.json once did. Local runs write
// source-status-local.json, which is gitignored.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SourceStatusEntry {
  lastAttempt: string;
  lastSuccess?: string;
  lastError?: string;
}
export type SourceStatus = Record<string, SourceStatusEntry>;

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

export function statusFileFor(job: string): string {
  return path.join(GENERATED_DIR, `source-status-${job}.json`);
}

export async function readSourceStatus(job: string): Promise<SourceStatus> {
  try {
    return JSON.parse(await readFile(statusFileFor(job), "utf-8"));
  } catch {
    return {};
  }
}

export async function recordSource(source: string, error?: unknown): Promise<void> {
  const job = process.env.SOURCE_STATUS_JOB || "local";
  const all = await readSourceStatus(job);
  const now = new Date().toISOString();
  const prev = all[source];
  all[source] = error
    ? { lastAttempt: now, lastSuccess: prev?.lastSuccess, lastError: String(error).slice(0, 300) }
    : { lastAttempt: now, lastSuccess: now };
  await writeFile(statusFileFor(job), JSON.stringify(all, null, 2));
}
