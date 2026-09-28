// Daily health check, run by .github/workflows/health-check.yml.
//
// Collects everything that says the site isn't current and working, and
// reports it where it'll be seen — a GitHub issue, which emails the repo
// owner by default:
//   - stale sources or finished games without a recap (check-freshness.ts)
//   - a stats or headlines job whose most recent run failed
//   - the live site serving older data than the repo has (a failed deploy)
//
// One open issue at a time: opened when problems appear, commented on
// while they persist, closed with a note once everything passes.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkFreshness } from "./check-freshness";

const SITE = "https://foxboro-files.vercel.app";
const ISSUE_TITLE = "Site health: problems found";
const WORKFLOWS = ["refresh-stats.yml", "refresh-headlines.yml"];

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

async function github(pathname: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.github.com/repos/${repo}${pathname}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

// Only each job's latest finished run: a failure followed by a success is
// already resolved, and reporting it would raise an alarm about something
// fixed. Anything that stays broken also shows up as stale data above.
async function failedRuns(): Promise<string[]> {
  if (!repo || !token) return ["Couldn't check recent runs (no GitHub token in this environment)"];
  const problems: string[] = [];
  for (const wf of WORKFLOWS) {
    const res = await github(`/actions/workflows/${wf}/runs?per_page=20`);
    if (!res.ok) {
      problems.push(`Couldn't list runs of ${wf} (HTTP ${res.status})`);
      continue;
    }
    const { workflow_runs } = (await res.json()) as {
      workflow_runs: Array<{ run_number: number; conclusion: string | null; created_at: string; html_url: string }>;
    };
    const latest = workflow_runs.find((run) => run.conclusion !== null);
    if (latest?.conclusion === "failure") {
      problems.push(`${wf}'s latest run (#${latest.run_number}) failed: ${latest.html_url}`);
    }
  }
  return problems;
}

async function liveSiteBehind(): Promise<string[]> {
  const repoMeta = JSON.parse(
    await readFile(path.join(process.cwd(), "data", "generated", "build-meta.json"), "utf-8")
  ) as { generatedAt: string };
  let siteMeta: { generatedAt?: string };
  try {
    const res = await fetch(`${SITE}/api/build-meta`, { cache: "no-store" });
    if (!res.ok) return [`The live site's /api/build-meta returned HTTP ${res.status}`];
    siteMeta = await res.json();
  } catch (err) {
    return [`The live site didn't respond: ${String(err)}`];
  }
  if (!siteMeta.generatedAt) return ["The live site doesn't report when its data was built"];
  const lagHours = (new Date(repoMeta.generatedAt).getTime() - new Date(siteMeta.generatedAt).getTime()) / 3_600_000;
  // A deploy takes minutes; three hours behind means one didn't happen.
  return lagHours > 3
    ? [`The live site is serving data from ${siteMeta.generatedAt}, ${Math.round(lagHours)} hours behind the repo (${repoMeta.generatedAt}) — check Vercel deployments`]
    : [];
}

async function report(problems: string[]): Promise<void> {
  if (!repo || !token) return;
  const res = await github(`/issues?state=open&per_page=100&creator=${encodeURIComponent("github-actions[bot]")}`);
  const open = res.ok
    ? ((await res.json()) as Array<{ number: number; title: string; pull_request?: unknown }>).find(
        (i) => i.title === ISSUE_TITLE && !i.pull_request
      )
    : undefined;
  const list = problems.map((p) => `- ${p}`).join("\n");
  const when = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

  if (problems.length > 0 && !open) {
    await github("/issues", {
      method: "POST",
      body: JSON.stringify({
        title: ISSUE_TITLE,
        body: `The daily health check (${when}) found:\n\n${list}\n\nThis issue closes itself once a check passes. How the checks work: scripts/health-check.ts and scripts/check-freshness.ts.`,
      }),
    });
  } else if (problems.length > 0 && open) {
    await github(`/issues/${open.number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: `Still failing as of ${when}:\n\n${list}` }),
    });
  } else if (open) {
    await github(`/issues/${open.number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: `All checks pass as of ${when}. Closing.` }),
    });
    await github(`/issues/${open.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
  }
}

async function main() {
  const problems = [...(await checkFreshness(["stats", "headlines"])), ...(await failedRuns()), ...(await liveSiteBehind())];
  await report(problems);
  if (problems.length > 0) {
    console.error("✖ Health check found problems:");
    for (const p of problems) console.error(`   - ${p}`);
    process.exit(1);
  }
  console.log("✓ Site is healthy: sources fresh, recent runs green, live site current.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
