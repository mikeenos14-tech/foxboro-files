// Real traditional-stat companions to the Next Game Matchups tab's
// opponent-adjusted EPA grades (see adjustedRate.ts's computeAdjustedPair).
// Deliberately scoped to match each grade exactly: whole-team posteam/
// defteam play_type filters, not position-filtered — computeAdjustedPair's
// isRun/isPass filters are "every rush/pass play this team was on either
// side of," so the real box-score number sitting next to that grade needs
// to describe the same population, or the two would quietly disagree.

import { bool01, num } from "./csv";
import type { PbpRow } from "./pbp";

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

export function passOffenseStatLine(pbp: PbpRow[], team: string): string {
  const rows = pbp.filter((r) => r.posteam === team && bool01(r.pass_attempt));
  if (rows.length === 0) return "";
  const completions = rows.filter((r) => bool01(r.complete_pass));
  const yards = completions.reduce((sum, r) => sum + num(r.yards_gained), 0);
  const tds = rows.filter((r) => bool01(r.pass_touchdown)).length;
  const ints = rows.filter((r) => bool01(r.interception)).length;
  return `${completions.length}/${rows.length} (${fmtPct(completions.length / rows.length)}), ${yards} yds, ${tds} TD, ${ints} INT`;
}

export function passDefenseStatLine(pbp: PbpRow[], team: string): string {
  const rows = pbp.filter((r) => r.defteam === team && bool01(r.pass_attempt));
  if (rows.length === 0) return "";
  const completions = rows.filter((r) => bool01(r.complete_pass));
  const yards = completions.reduce((sum, r) => sum + num(r.yards_gained), 0);
  const tds = rows.filter((r) => bool01(r.pass_touchdown)).length;
  const ints = rows.filter((r) => bool01(r.interception)).length;
  return `${completions.length}/${rows.length} (${fmtPct(completions.length / rows.length)}) allowed, ${yards} yds allowed, ${tds} TD allowed, ${ints} INT gained`;
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
