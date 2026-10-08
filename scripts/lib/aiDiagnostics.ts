// What happened on every AI generation attempt, written to a small
// committed file. GitHub truncates the build step's log, so when a
// rewrite was rejected there was no way to see why. One entry per piece
// of content, overwritten on each attempt.
//
// One file per workflow, never shared: the stats job (recaps, preview)
// writes ai-diagnostics.json and the headlines job (beat digest) writes
// ai-diagnostics-news.json. A single shared file made the two jobs'
// commits conflict whenever they ran close together, and the stats
// refresh failed to push.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

export interface AiOutcome {
  status: "written" | "rejected" | "no-response";
  /** Check failures per draft, when rejected. */
  problems: string[][];
  /** Why no response came back ("API key rejected (HTTP 401)"), when known. */
  error?: string;
}

export async function recordAiOutcome(
  label: string,
  outcome: AiOutcome,
  file: "ai-diagnostics.json" | "ai-diagnostics-news.json" = "ai-diagnostics.json"
): Promise<void> {
  const target = path.join(GENERATED_DIR, file);
  let all: Record<string, AiOutcome & { at: string }> = {};
  try {
    all = JSON.parse(await readFile(target, "utf-8"));
  } catch {
    // First run — start fresh.
  }
  all[label] = { ...outcome, at: new Date().toISOString() };
  await writeFile(target, JSON.stringify(all, null, 2));
}
