// Single entry point for rebuilding every derived file in data/generated/
// from one consistent snapshot of data/raw/.
//
// Why this exists: build-data.ts and build-league-data.ts both compute
// opponent-adjusted team EPA, into two different files (team-stats.json
// and league-epa-rankings.json). Running one without the other — which is
// easy to do by hand while iterating on a single feature — commits a
// state where the Home page and the Around the League page disagree about
// the same number. That shipped to production once: Home said NE's
// offense was 20th (-0.057) while the League page said 7th (+0.231),
// purely because the league file was regenerated four hours earlier
// against an older play-by-play snapshot.
//
// So: always rebuild through this script, never an individual build-*.ts,
// and this asserts the cross-file invariants at the end rather than
// trusting that they held.
//
// Run with: npm run build:data

import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyData } from "./verify-data";

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

// Order matters: build-data.ts writes next-game.json, which
// build-next-game-data.ts reads; build-ai-recap.ts enriches files the
// three before it produce.
const BUILD_STEPS = [
  "scripts/build-data.ts",
  "scripts/build-league-data.ts",
  "scripts/build-roster-data.ts",
  "scripts/build-next-game-data.ts",
];

// AI steps are separated because they need ANTHROPIC_API_KEY and are
// expected to no-op locally. A data step failing is a hard error; an AI
// step failing leaves the previous good content in place (see
// build-ai-recap.ts's own fail-soft handling).
const AI_STEPS = ["scripts/build-ai-recap.ts"];

function run(script: string): boolean {
  console.log(`\n▶ ${script}`);
  const result = spawnSync("npx", ["tsx", script], { stdio: "inherit" });
  return result.status === 0;
}

async function main() {
  const skipAi = process.argv.includes("--skip-ai");

  for (const step of BUILD_STEPS) {
    if (!run(step)) {
      console.error(`\n✖ ${step} failed — stopping. Derived data is now partially rebuilt and must not be committed.`);
      process.exit(1);
    }
  }

  if (!skipAi) {
    for (const step of AI_STEPS) {
      // Fail-soft by design: no API key locally is normal.
      if (!run(step)) console.warn(`⚠ ${step} failed — keeping previous AI content.`);
    }
  }

  const failures = await verifyData();
  if (failures.length > 0) {
    console.error("\n✖ Cross-file consistency check FAILED:");
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }

  // A single stamp for the whole snapshot, so the site can show how fresh
  // its numbers are — previously nothing in the UI exposed this, which is
  // why stale data was invisible.
  await writeFile(
    path.join(GENERATED_DIR, "build-meta.json"),
    JSON.stringify({ generatedAt: new Date().toISOString() }, null, 2)
  );

  console.log("\n✓ All builds complete, cross-file consistency verified.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
