// Early warning: every team's receiving and rushing lines against
// nflverse's official totals, not just New England's.
//
// verify-data.ts blocks a refresh when a number the site shows is wrong,
// and only New England's player lines are shown. That's correct, but it
// means a new kind of unusual play — a lateral, an aborted snap — is
// first noticed when it happens in a Patriots game, and the whole site
// stops updating until it's fixed (Week 5, 2026: a Chism-to-Henderson
// lateral froze the Raiders result for a day). Laterals and aborted snaps
// had already happened elsewhere in the league weeks earlier.
//
// This runs the same comparison for all 32 teams and writes what it finds
// to data/generated/league-audit.json. Each player is compared on his
// whole season across every team he played for, since that's what
// nflverse's line is — a trade isn't a mismatch. It never blocks anything; the
// daily health check reports any mismatch, so the bug gets fixed the
// week it first appears anywhere.
//
// Run: npx tsx scripts/league-audit.ts

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv } from "./lib/csv";
import { loadRegularSeasonPbp } from "./lib/pbp";
import { seasonLines } from "./lib/seasonLines";

const OUT = path.join(process.cwd(), "data", "generated", "league-audit.json");

async function main() {
  const at = new Date().toISOString();
  let pbp, official;
  try {
    pbp = await loadRegularSeasonPbp("play_by_play_2026.csv");
    official = await loadCsv<Record<string, string>>("stats_player_reg_2026.csv");
  } catch {
    console.log("League audit skipped: raw files missing.");
    return;
  }
  // Same rule as verify-data: compare only when nflverse's totals cover
  // the weeks the play-by-play does.
  const pbpWeek = pbp.reduce((m, r) => Math.max(m, Number(r.week) || 0), 0);
  const covered = official.reduce((m, r) => Math.max(m, Number(r.games) || 0), 0);
  if (covered < pbpWeek) {
    console.log(`League audit skipped: nflverse totals cover ${covered} weeks, play-by-play ${pbpWeek}.`);
    return;
  }

  // One comparison per player, on his whole season across every team he
  // played for — nflverse's line is the combined one (seasonLines.ts).
  const byId = new Map(official.map((r) => [r.player_id, r]));
  const n = (v?: string) => (!v || v === "NA" ? 0 : Number(v));
  const mismatches: string[] = [];
  let checked = 0;
  const compare = (
    lines: Map<string, { numbers: Record<string, number>; teams: string[] }>,
    fields: Array<[string, string, string]>
  ) => {
    for (const [playerId, line] of lines) {
      const o = byId.get(playerId);
      if (!o) continue;
      checked++;
      const who = `${line.teams.join("/")} ${o.player_display_name}`;
      for (const [label, column, what] of fields) {
        const ours = line.numbers[label];
        if (ours === undefined) continue;
        const theirs = n(o[column]);
        if (Math.abs(ours - theirs) > 0.5) mismatches.push(`${who} ${what}: site ${ours}, nflverse ${theirs}`);
      }
    }
  };
  compare(seasonLines(pbp, "receiving"), [
    ["Rec", "receptions", "receptions"],
    ["Rec#2", "targets", "targets"],
    ["Yds", "receiving_yards", "receiving yards"],
    ["TD", "receiving_tds", "receiving TDs"],
  ]);
  compare(seasonLines(pbp, "rushing"), [
    ["Att", "carries", "carries"],
    ["Yds", "rushing_yards", "rushing yards"],
    ["TD", "rushing_tds", "rushing TDs"],
  ]);
  await writeFile(OUT, JSON.stringify({ at, checked, mismatches }, null, 2));
  console.log(`League audit: ${checked} player lines, ${mismatches.length} mismatches.`);
  for (const m of mismatches) console.log(`   - ${m}`);
}

main().catch((err) => {
  // An early-warning tool must never fail the refresh.
  console.error("League audit error:", err);
});
