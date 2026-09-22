// Cross-file consistency checks over whatever is currently in
// data/generated/ — run standalone (npm run verify:data) or at the end of
// a full rebuild (scripts/build-all.ts).
//
// These assert invariants that hold by construction when every build
// script runs off the same data/raw/ snapshot, and are silently false
// when they don't. That exact skew shipped to production once: Home
// showed NE's offense 20th (-0.057) while Around the League showed 7th
// (+0.231), because league-epa-rankings.json had been regenerated four
// hours earlier than team-stats.json against older play-by-play.
//
// Kept separate from build-all.ts so it can validate committed state
// without rebuilding it — a rebuild would paper over exactly the
// corruption this is meant to detect.

import { readFile } from "node:fs/promises";
import path from "node:path";

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");

async function readGenerated<T>(filename: string): Promise<T> {
  return JSON.parse(await readFile(path.join(GENERATED_DIR, filename), "utf-8")) as T;
}

interface TeamStats {
  epaPerPlay: {
    offense: { value: number; leagueRank: number };
    defense: { value: number; leagueRank: number };
  };
}
interface LeagueEpaRow {
  team: string;
  offenseEpa: number;
  offenseRank: number;
  defenseEpa: number;
  defenseRank: number;
}
interface PositionCard {
  group: string;
  grade: number;
}
interface PositionLeagueTeam {
  team: string;
  groups: Array<{ group: string; grade: number }>;
}

const TEAM = "NE";

export async function verifyData(): Promise<string[]> {
  const failures: string[] = [];

  // 1. team-stats.json and league-epa-rankings.json both come from
  //    computeAdjustedEpa over the same rows — they must agree exactly,
  //    not approximately.
  const teamStats = await readGenerated<TeamStats>("team-stats.json");
  const league = await readGenerated<LeagueEpaRow[]>("league-epa-rankings.json");
  const ne = league.find((r) => r.team === TEAM);

  if (!ne) {
    failures.push("league-epa-rankings.json has no NE row");
  } else {
    const valueChecks: Array<[string, number, number]> = [
      ["offense EPA", teamStats.epaPerPlay.offense.value, ne.offenseEpa],
      ["defense EPA", teamStats.epaPerPlay.defense.value, ne.defenseEpa],
    ];
    for (const [label, a, b] of valueChecks) {
      if (Math.abs(a - b) > 1e-9) {
        failures.push(
          `${label}: team-stats.json says ${a.toFixed(4)}, league-epa-rankings.json says ${b.toFixed(4)} — one file is stale`
        );
      }
    }
    const rankChecks: Array<[string, number, number]> = [
      ["offense rank", teamStats.epaPerPlay.offense.leagueRank, ne.offenseRank],
      ["defense rank", teamStats.epaPerPlay.defense.leagueRank, ne.defenseRank],
    ];
    for (const [label, a, b] of rankChecks) {
      if (a !== b) {
        failures.push(`${label}: team-stats.json says ${a}, league-epa-rankings.json says ${b} — one file is stale`);
      }
    }
  }

  // 2. The featured team's position-group card grades must match its row
  //    in the league-wide table those same grades are ranked within.
  const cards = await readGenerated<PositionCard[]>("position-group-cards.json");
  const posLeague = await readGenerated<PositionLeagueTeam[]>("position-group-league-table.json");
  const neGroups = posLeague.find((t) => t.team === TEAM);
  if (!neGroups) {
    failures.push("position-group-league-table.json has no NE row");
  } else {
    for (const card of cards) {
      const row = neGroups.groups.find((g) => g.group === card.group);
      if (!row) continue;
      if (row.grade !== card.grade) {
        failures.push(
          `${card.group} grade: position-group-cards.json says ${card.grade}, position-group-league-table.json says ${row.grade} — one file is stale`
        );
      }
    }
  }

  // 3. Nothing fabricated should reach the site. LB had no real metric
  //    behind it and used to be merged in from fixtures with an invented
  //    grade and an invented claim about the defense.
  if (cards.some((c) => c.group === "LB")) {
    failures.push("position-group-cards.json contains an LB card — no real metric backs it");
  }

  return failures;
}

async function main() {
  const failures = await verifyData();
  if (failures.length > 0) {
    console.error("✖ Data consistency check FAILED:");
    for (const f of failures) console.error(`   - ${f}`);
    process.exit(1);
  }
  console.log("✓ Data consistency verified.");
}

// Only run as a CLI when invoked directly, so build-all.ts can import
// verifyData() without triggering a second process.exit path.
if (process.argv[1]?.endsWith("verify-data.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
