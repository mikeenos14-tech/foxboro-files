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
// to data/generated/league-audit.json. It never blocks anything; the
// daily health check reports any mismatch, so the bug gets fixed the
// week it first appears anywhere.
//
// Run: npx tsx scripts/league-audit.ts

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCsv } from "./lib/csv";
import { loadRegularSeasonPbp } from "./lib/pbp";
import { receivingLeaders, rushingLeaders } from "./lib/leaderboards";
import { ALL_TEAMS } from "./lib/teams";

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

  const byId = new Map(official.map((r) => [r.player_id, r]));
  const n = (v?: string) => (!v || v === "NA" ? 0 : Number(v));
  const stat = (l: { stats: Array<{ label: string; value: string }> }, k: string) =>
    l.stats.find((s) => s.label === k)?.value ?? "";
  const mismatches: string[] = [];
  let checked = 0;
  for (const team of ALL_TEAMS) {
    for (const l of receivingLeaders(pbp, new Map(), team)) {
      const o = byId.get(l.playerId);
      if (!o || o.recent_team !== team) continue;
      checked++;
      const [rec, targets] = stat(l, "Rec").split("/").map(Number);
      for (const [what, ours, theirs] of [
        ["receptions", rec, n(o.receptions)],
        ["targets", targets, n(o.targets)],
        ["receiving yards", Number(stat(l, "Yds")), n(o.receiving_yards)],
        ["receiving TDs", Number(stat(l, "TD")), n(o.receiving_tds)],
      ] as const) {
        if (Math.abs(ours - theirs) > 0.5) mismatches.push(`${team} ${o.player_display_name} ${what}: site ${ours}, nflverse ${theirs}`);
      }
    }
    for (const l of rushingLeaders(pbp, new Map(), team)) {
      const o = byId.get(l.playerId);
      if (!o || o.recent_team !== team) continue;
      checked++;
      for (const [what, ours, theirs] of [
        ["carries", Number(stat(l, "Att")), n(o.carries)],
        ["rushing yards", Number(stat(l, "Yds")), n(o.rushing_yards)],
        ["rushing TDs", Number(stat(l, "TD")), n(o.rushing_tds)],
      ] as const) {
        if (Math.abs(ours - theirs) > 0.5) mismatches.push(`${team} ${o.player_display_name} ${what}: site ${ours}, nflverse ${theirs}`);
      }
    }
  }
  await writeFile(OUT, JSON.stringify({ at, checked, mismatches }, null, 2));
  console.log(`League audit: ${checked} player lines, ${mismatches.length} mismatches.`);
  for (const m of mismatches) console.log(`   - ${m}`);
}

main().catch((err) => {
  // An early-warning tool must never fail the refresh.
  console.error("League audit error:", err);
});
