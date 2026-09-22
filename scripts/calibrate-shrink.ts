// Measures the shrinkage constants instead of guessing them.
//
// Run once per season against a COMPLETED season:
//   npm run calibrate:shrink 2025
//
// Needs play_by_play_<season>.csv and roster_<season>.csv in data/raw/,
// which is a gitignored cache — fetch them first if the season being
// calibrated isn't the one the pipeline currently pulls.
//
// Prints the empirical-Bayes K for each metric (K = play-to-play noise
// divided by real spread in team talent), alongside the constant
// currently hardcoded in lib/shrink.ts, and the metric's full-season
// reliability.
//
// Why this exists: SHRINK_K started as four numbers picked by feel, and
// the obvious question — "do these safeguards ever stop holding the
// numbers down?" — has no honest answer while the constants are
// arbitrary. Measured against the real 2025 season the hand-picked
// values were 5-18x too small, which is worth knowing even though, as
// the notes in lib/shrink.ts explain, it barely moves a percentile
// display.
//
// The reliability column is the more important output. It says how much
// of a metric's league ordering is real once a FULL season is in hand:
//
//   Team EPA/play       0.77   solid
//   Team EPA/dropback   0.74   solid
//   WR EPA/target       0.59   usable
//   RB EPA/carry        0.41   marginal even in January
//   TE EPA/target       0.29   mostly noise even in January
//
// The bottom two are not a small-sample problem that time fixes. They
// are what the metric is worth.

import { loadCsv, bool01, num } from "./lib/csv";
import { ALL_TEAMS } from "./lib/teams";
import { reliability, calibrateK } from "./lib/reliability";
import { SHRINK_K } from "./lib/shrink";
import type { PbpRow } from "./lib/pbp";

async function main() {
  const season = process.argv[2] ?? "2025";
  const pbp = await loadCsv<PbpRow>(`play_by_play_${season}.csv`);
  const roster = await loadCsv<Record<string, string>>(`roster_${season}.csv`);

  const position = new Map<string, string>();
  for (const r of roster) if (r.gsis_id) position.set(r.gsis_id, r.position);

  const epa = (r: PbpRow): number | null =>
    r.epa === "" || r.epa === "NA" ? null : num(r.epa);

  const targetOf = (pos: string) => (r: PbpRow, t: string) =>
    r.posteam === t &&
    bool01(r.pass_attempt) &&
    !!r.receiver_id &&
    position.get(r.receiver_id) === pos;

  const metrics: Array<{
    label: string;
    currentK: number;
    match: (r: PbpRow, t: string) => boolean;
  }> = [
    { label: "WR EPA/target", currentK: SHRINK_K.receivingEpa, match: targetOf("WR") },
    { label: "TE EPA/target", currentK: SHRINK_K.receivingEpa, match: targetOf("TE") },
    {
      label: "RB EPA/carry",
      currentK: SHRINK_K.rushingEpa,
      match: (r, t) =>
        r.posteam === t && r.play_type === "run" && !!r.rusher_id && position.get(r.rusher_id) === "RB",
    },
    {
      label: "Team EPA/dropback",
      currentK: SHRINK_K.passingEpa,
      match: (r, t) => r.posteam === t && bool01(r.pass_attempt),
    },
    {
      label: "Team EPA/play",
      currentK: SHRINK_K.teamRate,
      match: (r, t) => r.posteam === t && (r.play_type === "run" || r.play_type === "pass"),
    },
  ];

  console.log(`\nShrinkage calibration — ${season} full season\n`);
  console.log("metric              currentK  derivedK  reliability  median n");
  console.log("-".repeat(66));

  for (const m of metrics) {
    const groups = ALL_TEAMS.map((t) =>
      pbp.filter((r) => m.match(r, t)).map(epa).filter((v): v is number => v !== null)
    );
    const r = reliability(groups);
    const k = calibrateK(groups);
    const ns = groups.map((g) => g.length).sort((a, b) => a - b);
    console.log(
      `${m.label.padEnd(20)}${String(m.currentK).padStart(8)}  ` +
        `${(k === null ? "n/a" : k.toFixed(0)).padStart(8)}  ` +
        `${r.reliability.toFixed(2).padStart(11)}  ${String(ns[16]).padStart(8)}`
    );
  }

  console.log(
    "\nderivedK = play-to-play variance / real between-team variance." +
      "\nIt is also the sample size at which a metric is half-trusted," +
      "\nwhich is the standard 'stabilization point' from the literature.\n"
  );
}

main();
