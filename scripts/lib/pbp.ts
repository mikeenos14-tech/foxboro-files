// Aggregation helpers over nflverse play-by-play rows.
// pbp already ships computed epa/wp/wpa/success columns — no win-probability
// or EPA model needs to be built from scratch here, only aggregated.

import { num, bool01 } from "./csv";
import { passerId, rusherId } from "./playerIds";

export type PbpRow = Record<string, string>;

const SCRIMMAGE_TYPES = new Set(["pass", "run"]);

function isScrimmage(row: PbpRow): boolean {
  return SCRIMMAGE_TYPES.has(row.play_type);
}

function isExplosive(row: PbpRow): boolean {
  const yards = num(row.yards_gained);
  if (row.play_type === "run") return yards >= 10;
  if (row.play_type === "pass") return yards >= 15;
  return false;
}

export interface TeamSplitStats {
  epa: number;
  successRate: number;
  explosiveRate: number;
  yardsPerPlay: number;
  plays: number;
}

function aggregate(rows: PbpRow[]): TeamSplitStats {
  if (rows.length === 0) return { epa: 0, successRate: 0, explosiveRate: 0, yardsPerPlay: 0, plays: 0 };
  let epaSum = 0;
  let successSum = 0;
  let explosiveSum = 0;
  let yardsSum = 0;
  for (const r of rows) {
    epaSum += num(r.epa);
    successSum += bool01(r.success) ? 1 : 0;
    explosiveSum += isExplosive(r) ? 1 : 0;
    yardsSum += num(r.yards_gained);
  }
  return {
    epa: epaSum / rows.length,
    successRate: successSum / rows.length,
    explosiveRate: explosiveSum / rows.length,
    yardsPerPlay: yardsSum / rows.length,
    plays: rows.length,
  };
}

export function offenseStats(rows: PbpRow[], team: string): TeamSplitStats {
  return aggregate(rows.filter((r) => r.posteam === team && isScrimmage(r)));
}

export function defenseStats(rows: PbpRow[], team: string): TeamSplitStats {
  return aggregate(rows.filter((r) => r.defteam === team && isScrimmage(r)));
}

// EPA/play split by play type (run vs. pass) and side of ball — used
// wherever a unit-level (not whole-offense/defense) grade is needed, e.g.
// "rush offense vs. run defense" style matchups.
export function playTypeEpa(
  rows: PbpRow[],
  team: string,
  side: "posteam" | "defteam",
  playType: "run" | "pass"
): number {
  const filtered = rows.filter((r) => r[side] === team && r.play_type === playType);
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, r) => sum + num(r.epa), 0) / filtered.length;
}

// Sack rate the team's own offense allows (pass protection quality — lower
// is better) vs. the sack rate the team's defense generates against
// opponents (pass rush quality — higher is better).
export function sackRateAllowed(rows: PbpRow[], team: string): number {
  const dropbacks = rows.filter((r) => r.posteam === team && bool01(r.pass_attempt));
  if (dropbacks.length === 0) return 0;
  return dropbacks.filter((r) => bool01(r.sack)).length / dropbacks.length;
}

export function sackRateGenerated(rows: PbpRow[], team: string): number {
  const dropbacks = rows.filter((r) => r.defteam === team && bool01(r.pass_attempt));
  if (dropbacks.length === 0) return 0;
  return dropbacks.filter((r) => bool01(r.sack)).length / dropbacks.length;
}

// Same as sackRateAllowed, but excludes sacks FTN's charters flagged as
// the QB's own fault (held the ball too long, scrambled into pressure)
// rather than a real blocking breakdown — a fairer pass-protection metric
// than raw sack rate, which blames the OL for every sack regardless of
// cause. A sack with no charting match (not in qbFaultSackKeys) is treated
// as a real OL-caused sack, same as the raw metric would — this only
// removes sacks we have positive evidence weren't the line's fault.
export function olFaultSackRateAllowed(
  rows: PbpRow[],
  team: string,
  qbFaultSackKeys: Set<string>
): number {
  const dropbacks = rows.filter((r) => r.posteam === team && bool01(r.pass_attempt));
  if (dropbacks.length === 0) return 0;
  const olFaultSacks = dropbacks.filter(
    (r) => bool01(r.sack) && !qbFaultSackKeys.has(`${r.game_id}|${r.play_id}`)
  );
  return olFaultSacks.length / dropbacks.length;
}

// Sacks are a real but late, low-sample signal of pass protection — a
// tackle can get beaten repeatedly and get bailed out by a quick throw,
// and it never shows up as a sack. qb_hit is nflverse's own broader,
// earlier-triggering pressure marker (confirmed against real data: this
// season 348 dropbacks were marked qb_hit vs. only 147 sacks, and 11 of
// those sacks weren't even flagged qb_hit — a materially different, not
// redundant, signal). This is the rush-environment stat ("how often did
// the pass rush get home at all"), deliberately NOT narrowed by
// qbFaultSackKeys the way olFaultSackRateAllowed is — a sack from the QB
// holding the ball too long still means a real rusher got there, which is
// exactly what this metric is describing.
export function pressureRateAllowed(rows: PbpRow[], team: string): number {
  const dropbacks = rows.filter((r) => r.posteam === team && bool01(r.pass_attempt));
  if (dropbacks.length === 0) return 0;
  const pressured = dropbacks.filter((r) => bool01(r.sack) || bool01(r.qb_hit));
  return pressured.length / dropbacks.length;
}

export function successByDown(
  rows: PbpRow[],
  team: string,
  side: "posteam" | "defteam"
): Record<1 | 2 | 3 | 4, number> {
  const result = {} as Record<1 | 2 | 3 | 4, number>;
  for (const d of [1, 2, 3, 4] as const) {
    const plays = rows.filter(
      (r) => r[side] === team && isScrimmage(r) && num(r.down) === d
    );
    result[d] =
      plays.length === 0
        ? 0
        : plays.filter((r) => bool01(r.success)).length / plays.length;
  }
  return result;
}

export function thirdDown(
  rows: PbpRow[],
  team: string,
  side: "posteam" | "defteam"
): { att: number; conv: number } {
  const plays = rows.filter(
    (r) => r[side] === team && num(r.down) === 3 && isScrimmage(r)
  );
  const conv = plays.filter((r) => bool01(r.third_down_converted)).length;
  return { att: plays.length, conv };
}

export function redZone(
  rows: PbpRow[],
  team: string,
  side: "posteam" | "defteam"
): { att: number; td: number } {
  const byDrive = new Map<string, PbpRow[]>();
  for (const r of rows) {
    if (r[side] !== team) continue;
    const key = `${r.game_id}|${r.drive}`;
    if (!byDrive.has(key)) byDrive.set(key, []);
    byDrive.get(key)!.push(r);
  }
  let att = 0;
  let td = 0;
  for (const plays of byDrive.values()) {
    const reachedRedZone = plays.some((r) => num(r.yardline_100, 100) <= 20);
    if (!reachedRedZone) continue;
    att++;
    if (plays[0]?.fixed_drive_result === "Touchdown") td++;
  }
  return { att, td };
}

export function turnoverMargin(rows: PbpRow[], team: string): number {
  let takeaways = 0;
  let giveaways = 0;
  for (const r of rows) {
    const turnover = bool01(r.interception) || bool01(r.fumble_lost);
    if (!turnover) continue;
    if (r.defteam === team) takeaways++;
    if (r.posteam === team) giveaways++;
  }
  return takeaways - giveaways;
}

export function winProbabilityTimeline(
  rows: PbpRow[],
  sampleEvery = 8
): Array<{ playIndex: number; quarter: number; clock: string; homeWinProb: number }> {
  const sorted = rows
    .filter((r) => r.home_wp && r.home_wp !== "NA")
    .sort((a, b) => num(a.play_id) - num(b.play_id));
  const out: Array<{
    playIndex: number;
    quarter: number;
    clock: string;
    homeWinProb: number;
  }> = [];
  sorted.forEach((r, i) => {
    if (i % sampleEvery !== 0 && i !== sorted.length - 1) return;
    out.push({
      playIndex: i,
      quarter: num(r.qtr),
      clock: r.time || "",
      homeWinProb: num(r.home_wp, 0.5),
    });
  });
  return out;
}

export function starOfGame(
  rows: PbpRow[],
  team: string
): { playerId: string; playerName: string; wpa: number } | null {
  const wpaByPlayer = new Map<string, { name: string; wpa: number }>();
  for (const r of rows) {
    if (r.posteam !== team) continue;
    const wpa = num(r.wpa);
    if (r.play_type === "pass" && passerId(r)) {
      const cur = wpaByPlayer.get(passerId(r)) ?? { name: r.passer || r.passer_player_name, wpa: 0 };
      cur.wpa += wpa;
      wpaByPlayer.set(passerId(r), cur);
    } else if (r.play_type === "run" && rusherId(r)) {
      const cur = wpaByPlayer.get(rusherId(r)) ?? { name: r.rusher || r.rusher_player_name, wpa: 0 };
      cur.wpa += wpa;
      wpaByPlayer.set(rusherId(r), cur);
    }
  }
  let best: { playerId: string; playerName: string; wpa: number } | null = null;
  for (const [playerId, { name, wpa }] of wpaByPlayer) {
    if (!best || wpa > best.wpa) best = { playerId, playerName: name, wpa };
  }
  return best;
}

// Real penalty counting stats — a traditional stat EPA doesn't isolate on
// its own (a penalty's down/distance swing shows up in EPA, but "how
// disciplined is this team" as its own real number doesn't). penalty_team
// is the team that committed the penalty, whichever side of the ball they
// were on — confirmed against real data.
export function penaltyStats(rows: PbpRow[], team: string): { count: number; yards: number } {
  const penalties = rows.filter((r) => bool01(r.penalty) && r.penalty_team === team);
  return {
    count: penalties.length,
    yards: penalties.reduce((sum, r) => sum + num(r.penalty_yards), 0),
  };
}

// Team penalties (Delay of Game, Too Many Men) have no player attribution
// in the data — filtered out here rather than counted as a blank name.
// Keyed by playerId (not name) so the caller can resolve a real roster
// name instead of pbp's own abbreviated "M.Moses" form.
export function mostPenalizedPlayer(
  rows: PbpRow[],
  team: string
): { playerId: string; playerName: string; count: number } | null {
  const counts = new Map<string, { playerName: string; count: number }>();
  for (const r of rows) {
    if (!bool01(r.penalty) || r.penalty_team !== team || !r.penalty_player_id) continue;
    const cur = counts.get(r.penalty_player_id) ?? { playerName: r.penalty_player_name, count: 0 };
    cur.count += 1;
    counts.set(r.penalty_player_id, cur);
  }
  let best: { playerId: string; playerName: string; count: number } | null = null;
  for (const [playerId, { playerName, count }] of counts) {
    if (!best || count > best.count) best = { playerId, playerName, count };
  }
  return best;
}
