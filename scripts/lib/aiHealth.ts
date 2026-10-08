// Turns the AI diagnostics files into health-check problems. The AI steps
// fail softly by design — the site keeps its last good text — so a dead
// API key never turns a run red. This is where it gets noticed.

import type { AiOutcome } from "./aiDiagnostics";

type Diagnostics = Record<string, AiOutcome & { at: string }>;

// Entries are overwritten on every attempt, and anything still missing is
// retried each run (recaps without a Take, the preview, the digest), so a
// recent entry is the current state. Older ones belong to content that's
// no longer retried, like last week's preview.
const RECENT_HOURS = 36;

export function aiProblems(files: Diagnostics[], now = new Date()): string[] {
  const recent = files
    .flatMap((f) => Object.entries(f))
    .filter(([, o]) => (now.getTime() - new Date(o.at).getTime()) / 3_600_000 <= RECENT_HOURS);

  const problems: string[] = [];
  const failed = recent.filter(([, o]) => o.status === "no-response");
  const keyIssue = failed.find(([, o]) => /401|403|no ANTHROPIC_API_KEY/.test(o.error ?? ""));
  if (keyIssue) {
    problems.push(
      `AI writing is failing: ${keyIssue[1].error}. Replace ANTHROPIC_API_KEY under the repo's Settings → Secrets and variables → Actions. Affected: ${failed.map(([k]) => k).join(", ")}.`
    );
  } else {
    for (const [label, o] of failed) {
      problems.push(`AI writing failed for ${label}: ${o.error ?? "no response"}.`);
    }
  }
  for (const [label, o] of recent.filter(([, o]) => o.status === "rejected")) {
    const last = o.problems[o.problems.length - 1]?.join(" ") ?? "";
    problems.push(`The AI's ${label} failed its checks twice, so nothing was published${last ? ` (last reason: ${last})` : ""}.`);
  }
  return problems;
}
