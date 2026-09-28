// Real traditional-stat companions to the Next Game Matchups tab's
// opponent-adjusted EPA grades (see adjustedRate.ts's computeAdjustedPair).
// Deliberately scoped to match each grade exactly: whole-team posteam/
// defteam play_type filters, not position-filtered — computeAdjustedPair's
// isRun/isPass filters are "every rush/pass play this team was on either
// side of," so the real box-score number sitting next to that grade needs
// to describe the same population, or the two would quietly disagree.

import { bool01, num } from "./csv";
import type { PbpRow } from "./pbp";
import { passingLine } from "./boxScore";

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function rushOffenseStatLine(pbp: PbpRow[], team: string): string {
  const rows = pbp.filter((r) => r.posteam === team && r.play_type === "run");
  if (rows.length === 0) return "";
  const yards = rows.reduce((sum, r) => sum + num(r.yards_gained), 0);
  const ypc = yards / rows.length;
  const tds = rows.filter((r) => bool01(r.rush_touchdown)).length;
  const fumbles = rows.filter((r) => bool01(r.fumble_lost)).length;
  const explosiveRate = rows.filter((r) => num(r.yards_gained) >= 10).length / rows.length;
  return `${yards} yds, ${ypc.toFixed(1)} YPC, ${tds} TD, ${fumbles} FUM, ${fmtPct(explosiveRate)} explosive`;
}

export function rushDefenseStatLine(pbp: PbpRow[], team: string): string {
  const rows = pbp.filter((r) => r.defteam === team && r.play_type === "run");
  if (rows.length === 0) return "";
  const yards = rows.reduce((sum, r) => sum + num(r.yards_gained), 0);
  const ypc = yards / rows.length;
  const tds = rows.filter((r) => bool01(r.rush_touchdown)).length;
  const explosiveRate = rows.filter((r) => num(r.yards_gained) >= 10).length / rows.length;
  return `${yards} yds allowed, ${ypc.toFixed(1)} YPC allowed, ${tds} TD allowed, ${fmtPct(explosiveRate)} explosive allowed`;
}

// Box-score lines, so sacks and two-point tries aren't attempts (see
// boxScore.ts) — the sack-rate lines below keep every dropback.
export function passOffenseStatLine(pbp: PbpRow[], team: string): string {
  const line = passingLine(pbp.filter((r) => r.posteam === team));
  if (line.attempts === 0) return "";
  return `${line.completions}/${line.attempts} (${fmtPct(line.completions / line.attempts)}), ${line.yards} yds, ${line.tds} TD, ${line.ints} INT`;
}

export function passDefenseStatLine(pbp: PbpRow[], team: string): string {
  const line = passingLine(pbp.filter((r) => r.defteam === team));
  if (line.attempts === 0) return "";
  return `${line.completions}/${line.attempts} (${fmtPct(line.completions / line.attempts)}) allowed, ${line.yards} yds allowed, ${line.tds} TD allowed, ${line.ints} INT gained`;
}

export function passProStatLine(pbp: PbpRow[], team: string): string {
  const rows = pbp.filter((r) => r.posteam === team && bool01(r.pass_attempt));
  if (rows.length === 0) return "";
  const sacks = rows.filter((r) => bool01(r.sack)).length;
  return `${sacks} sacks allowed, ${fmtPct(sacks / rows.length)} sack rate`;
}

export function passRushStatLine(pbp: PbpRow[], team: string): string {
  const rows = pbp.filter((r) => r.defteam === team && bool01(r.pass_attempt));
  if (rows.length === 0) return "";
  const sacks = rows.filter((r) => bool01(r.sack)).length;
  const hits = rows.filter((r) => bool01(r.qb_hit)).length;
  return `${sacks} sacks, ${hits} QB hits, ${fmtPct(sacks / rows.length)} sack rate`;
}
