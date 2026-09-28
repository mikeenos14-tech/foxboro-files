// What happened on every AI generation attempt, written to a small
// committed file. GitHub truncates the build step's log, so when a
// rewrite was rejected there was no way to see why. This file is the
// record: data/generated/ai-diagnostics.json, one entry per piece of
// content, overwritten on each attempt.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "generated", "ai-diagnostics.json");

export interface AiOutcome {
  status: "written" | "rejected" | "no-response";
  /** Check failures per draft, when rejected. */
  problems: string[][];
}

export async function recordAiOutcome(label: string, outcome: AiOutcome): Promise<void> {
  let all: Record<string, AiOutcome & { at: string }> = {};
  try {
    all = JSON.parse(await readFile(FILE, "utf-8"));
  } catch {
    // First run — start fresh.
  }
  all[label] = { ...outcome, at: new Date().toISOString() };
  await writeFile(FILE, JSON.stringify(all, null, 2));
}
