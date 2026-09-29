// Aggregation helpers over nflverse play-by-play rows.
// pbp already ships computed epa/wp/wpa/success columns — no win-probability
// or EPA model needs to be built from scratch here, only aggregated.

import { num, bool01, loadCsv } from "./csv";
import { passerId, receiverId, rusherId } from "./playerIds";

export type PbpRow = Record<string, string>;

/** A play's id across the whole season: "2026_03_NE_JAX|1234". */
export function playKey(r: PbpRow): string {
  return `${r.game_id}|${r.play_id}`;
}

// Regular-season plays only. nflverse's season file gains the playoffs in
// January, and every season total and league rank here would quietly start
// counting extra games for the eight or so teams still playing — exactly
// what happened to the frozen 2025 snapshot, which showed Maye at 5,222
// yards for a 4,394-yard regular season.
export async function loadRegularSeasonPbp(filename: string): Promise<PbpRow[]> {
  return (await loadCsv<PbpRow>(filename)).filter((r) => r.season_type === "REG");
}

const SCRIMMAGE_TYPES = new Set(["pass", "run"]);

function isScrimmage(row: PbpRow): boolean {
  return SCRIMMAGE_TYPES.has(row.play_type);
}

export function isExplosive(row: PbpRow): boolean {
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

// Each recap number is counted from a selector that returns its plays,
// and the "see the plays" lists are built from the same selectors — so
// a card reading "4/12" always opens a list of exactly those 12 plays.
export function thirdDownPlays(rows: PbpRow[], team: string, side: "posteam" | "defteam"): PbpRow[] {
  return rows.filter((r) => r[side] === team && num(r.down) === 3 && isScrimmage(r));
}

export function thirdDown(
  rows: PbpRow[],
  team: string,
  side: "posteam" | "defteam"
): { att: number; conv: number } {
  const plays = thirdDownPlays(rows, team, side);
  const conv = plays.filter((r) => bool01(r.third_down_converted)).length;
  return { att: plays.length, conv };
}

export function explosivePlays(rows: PbpRow[], team: string, side: "posteam" | "defteam"): PbpRow[] {
  return rows.filter((r) => r[side] === team && isScrimmage(r) && isExplosive(r));
}

export interface RedZoneTrip {
  drive: string;
  touchdown: boolean;
  result: string;
  /** The drive's plays from the 20 in. */
  plays: PbpRow[];
}

export function redZoneTrips(rows: PbpRow[], team: string, side: "posteam" | "defteam"): RedZoneTrip[] {
  const byDrive = new Map<string, PbpRow[]>();
  for (const r of rows) {
    if (r[side] !== team) continue;
    const key = `${r.game_id}|${r.drive}`;
    if (!byDrive.has(key)) byDrive.set(key, []);
    byDrive.get(key)!.push(r);
  }
  const trips: RedZoneTrip[] = [];
  for (const [key, plays] of byDrive) {
    if (!plays.some((r) => num(r.yardline_100, 100) <= 20)) continue;
    trips.push({
      drive: key.split("|")[1],
      touchdown: plays[0]?.fixed_drive_result === "Touchdown",
      result: plays[0]?.fixed_drive_result || "",
      plays: plays.filter(
        (r) => num(r.yardline_100, 100) <= 20 && r.play_type !== "extra_point" && r.play_type !== "kickoff" && !!r.desc
      ),
    });
  }
  return trips;
}

export function redZone(
  rows: PbpRow[],
  team: string,
  side: "posteam" | "defteam"
): { att: number; td: number } {
  const trips = redZoneTrips(rows, team, side);
  return { att: trips.length, td: trips.filter((t) => t.touchdown).length };
}

export function turnoverPlays(rows: PbpRow[], team: string): { giveaways: PbpRow[]; takeaways: PbpRow[] } {
  const turnovers = rows.filter((r) => bool01(r.interception) || bool01(r.fumble_lost));
  return {
    giveaways: turnovers.filter((r) => r.posteam === team),
    takeaways: turnovers.filter((r) => r.defteam === team),
  };
}

export function turnoverMargin(rows: PbpRow[], team: string): number {
  const { giveaways, takeaways } = turnoverPlays(rows, team);
  return takeaways.length - giveaways.length;
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

// Touchdowns, made field goals and safeties per side, straight from the
// scoring plays. td_team is whoever scored (defensive and return TDs
// included); a safety is scored by the defense.
export function scoringSummary(
  rows: PbpRow[],
  team: string
): { td: number; fg: number; safety: number } {
  return {
    td: rows.filter((r) => bool01(r.touchdown) && r.td_team === team).length,
    fg: rows.filter((r) => r.field_goal_result === "made" && r.posteam === team).length,
    safety: rows.filter((r) => bool01(r.safety) && r.defteam === team).length,
  };
}

export type StarRole = "passing" | "rushing" | "receiving" | "defense" | "kicking" | "returns";

// New England's player of the game by win probability added.
//
// It used to credit only passers and runners, so a receiver's 150-yard
// day, a strip-sack or a game-winning field goal could never win it. Now
// every New England player directly involved in a play is credited with
// that play's WPA, from New England's side:
//   - passer and targeted receiver each get the full play (the same way
//     nflverse credits passing and receiving EPA to both)
//   - runner
//   - defender with the sack (half each on a split sack), interception or
//     forced fumble — nflverse's wpa is the offense's, so a defensive play
//     is credited with its sign flipped
//   - kicker on field goals and extra points
//   - kick and punt returner
export function starOfGame(
  rows: PbpRow[],
  team: string
): {
  playerId: string;
  playerName: string;
  wpa: number;
  role: StarRole;
  /** Every play he was credited on and how much — they sum to wpa. */
  plays: Array<{ key: string; wpa: number }>;
} | null {
  const totals = new Map<
    string,
    { name: string; wpa: number; byRole: Map<StarRole, number>; plays: Array<{ key: string; wpa: number }> }
  >();
  let currentKey = "";
  // At most once per player per play: a strip-sack names the same
  // defender as sacker and fumble-forcer, and was counted twice.
  let creditedThisPlay = new Set<string>();
  const credit = (id: string | undefined, name: string | undefined, wpa: number, role: StarRole) => {
    if (!id || id === "NA" || creditedThisPlay.has(id)) return;
    creditedThisPlay.add(id);
    const cur = totals.get(id) ?? { name: name || "", wpa: 0, byRole: new Map<StarRole, number>(), plays: [] as Array<{ key: string; wpa: number }> };
    cur.wpa += wpa;
    cur.plays.push({ key: currentKey, wpa });
    cur.byRole.set(role, (cur.byRole.get(role) ?? 0) + wpa);
    totals.set(id, cur);
  };

  for (const r of rows) {
    creditedThisPlay = new Set();
    currentKey = playKey(r);
    if (r.wpa === "" || r.wpa === "NA") continue;
    const ours = r.posteam === team ? num(r.wpa) : r.defteam === team ? -num(r.wpa) : 0;
    if (ours === 0) continue;

    if (r.posteam === team) {
      if (r.play_type === "pass") {
        credit(passerId(r), r.passer || r.passer_player_name, ours, "passing");
        credit(receiverId(r), r.receiver || r.receiver_player_name, ours, "receiving");
      } else if (r.play_type === "run") {
        credit(rusherId(r), r.rusher || r.rusher_player_name, ours, "rushing");
      } else if (r.play_type === "field_goal" || r.play_type === "extra_point") {
        credit(r.kicker_player_id, r.kicker_player_name, ours, "kicking");
      } else if (r.play_type === "kickoff") {
        // On kickoffs nflverse's posteam is the receiving team.
        credit(r.kickoff_returner_player_id, r.kickoff_returner_player_name, ours, "returns");
      }
    } else if (r.defteam === team) {
      if (bool01(r.sack)) {
        if (r.sack_player_id && r.sack_player_id !== "NA") {
          credit(r.sack_player_id, r.sack_player_name, ours, "defense");
        } else {
          credit(r.half_sack_1_player_id, r.half_sack_1_player_name, ours / 2, "defense");
          credit(r.half_sack_2_player_id, r.half_sack_2_player_name, ours / 2, "defense");
        }
      }
      if (bool01(r.interception)) credit(r.interception_player_id, r.interception_player_name, ours, "defense");
      if (r.forced_fumble_player_1_team === team) {
        credit(r.forced_fumble_player_1_player_id, r.forced_fumble_player_1_player_name, ours, "defense");
      }
      // On punts the punting team has the ball; our returner is on defteam.
      if (r.play_type === "punt") credit(r.punt_returner_player_id, r.punt_returner_player_name, ours, "returns");
    }
  }

  let best: ReturnType<typeof starOfGame> = null;
  for (const [playerId, { name, wpa, byRole, plays }] of totals) {
    if (!best || wpa > best.wpa) {
      const role = [...byRole.entries()].sort((a, b) => b[1] - a[1])[0][0];
      best = { playerId, playerName: name, wpa, role, plays };
    }
  }
  return best;
}

// Real penalty counting stats — a traditional stat EPA doesn't isolate on
// its own (a penalty's down/distance swing shows up in EPA, but "how
// disciplined is this team" as its own real number doesn't). penalty_team
// is the team that committed the penalty, whichever side of the ball they
// were on — confirmed against real data.
export function penaltyPlays(rows: PbpRow[], team: string): PbpRow[] {
  return rows.filter((r) => bool01(r.penalty) && r.penalty_team === team);
}

// Scrimmage plays inside the last two minutes of either half.
export function twoMinutePlays(rows: PbpRow[], team: string, side: "posteam" | "defteam"): PbpRow[] {
  return rows.filter(
    (r) => r[side] === team && (r.play_type === "pass" || r.play_type === "run") && num(r.half_seconds_remaining, 999) <= 120
  );
}

export function fieldGoalAttempts(rows: PbpRow[], team: string): PbpRow[] {
  return rows.filter((r) => r.posteam === team && r.play_type === "field_goal");
}

export function penaltyStats(rows: PbpRow[], team: string): { count: number; yards: number } {
  const penalties = penaltyPlays(rows, team);
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
