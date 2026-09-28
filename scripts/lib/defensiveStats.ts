// Real, free, per-player defensive counting stats — sacks, QB hits,
// tackles for loss, forced fumbles, interceptions, and passes defended —
// straight from nflverse's own player-attribution columns in play-by-play
// (sack_player_id, tackle_for_loss_1_player_id, interception_player_id,
// pass_defense_1_player_id, etc.). Verified these are real and populated
// for actual games, not placeholder columns. This is genuinely different
// data from the team-wide EPA/sack-rate proxies used for the Edge/
// Interior DL/Secondary grades elsewhere — those stay grade inputs; this
// is real per-player texture layered alongside them.

import type { PbpRow } from "./pbp";
import type { RosterRow } from "./roster";

export interface DefensivePlayerLine {
  playerId: string;
  playerName: string;
  sacks: number;
  qbHits: number;
  tfl: number;
  forcedFumbles: number;
  interceptions: number;
  passesDefended: number;
  /** Every play that added to the counts above, for "see the plays". */
  playKeys: string[];
}

type CountField = Exclude<keyof DefensivePlayerLine, "playerId" | "playerName" | "playKeys">;

function bump(
  byPlayer: Map<string, DefensivePlayerLine>,
  playerId: string,
  playerName: string,
  field: CountField,
  amount: number,
  playKey: string
) {
  if (!playerId) return;
  const line =
    byPlayer.get(playerId) ??
    ({ playerId, playerName, sacks: 0, qbHits: 0, tfl: 0, forcedFumbles: 0, interceptions: 0, passesDefended: 0, playKeys: [] } satisfies DefensivePlayerLine);
  line[field] += amount;
  if (!line.playKeys.includes(playKey)) line.playKeys.push(playKey);
  byPlayer.set(playerId, line);
}

export function computeDefensivePlayerStats(rows: PbpRow[], team: string): Map<string, DefensivePlayerLine> {
  const byPlayer = new Map<string, DefensivePlayerLine>();
  for (const r of rows) {
    if (r.defteam !== team) continue;
    const key = `${r.game_id}|${r.play_id}`;
    if (r.sack_player_id) bump(byPlayer, r.sack_player_id, r.sack_player_name, "sacks", 1, key);
    if (r.half_sack_1_player_id) bump(byPlayer, r.half_sack_1_player_id, r.half_sack_1_player_name, "sacks", 0.5, key);
    if (r.half_sack_2_player_id) bump(byPlayer, r.half_sack_2_player_id, r.half_sack_2_player_name, "sacks", 0.5, key);
    if (r.qb_hit_1_player_id) bump(byPlayer, r.qb_hit_1_player_id, r.qb_hit_1_player_name, "qbHits", 1, key);
    if (r.qb_hit_2_player_id) bump(byPlayer, r.qb_hit_2_player_id, r.qb_hit_2_player_name, "qbHits", 1, key);
    if (r.tackle_for_loss_1_player_id) bump(byPlayer, r.tackle_for_loss_1_player_id, r.tackle_for_loss_1_player_name, "tfl", 1, key);
    if (r.tackle_for_loss_2_player_id) bump(byPlayer, r.tackle_for_loss_2_player_id, r.tackle_for_loss_2_player_name, "tfl", 1, key);
    // forced_fumble_player_N_team is the forcer's own team — checked
    // real data to confirm (not the fumbler's team), so this filter is
    // correct, not redundant with the defteam check above.
    if (r.forced_fumble_player_1_team === team && r.forced_fumble_player_1_player_id) {
      bump(byPlayer, r.forced_fumble_player_1_player_id, r.forced_fumble_player_1_player_name, "forcedFumbles", 1, key);
    }
    if (r.forced_fumble_player_2_team === team && r.forced_fumble_player_2_player_id) {
      bump(byPlayer, r.forced_fumble_player_2_player_id, r.forced_fumble_player_2_player_name, "forcedFumbles", 1, key);
    }
    if (r.interception_player_id) bump(byPlayer, r.interception_player_id, r.interception_player_name, "interceptions", 1, key);
    if (r.pass_defense_1_player_id) bump(byPlayer, r.pass_defense_1_player_id, r.pass_defense_1_player_name, "passesDefended", 1, key);
    if (r.pass_defense_2_player_id) bump(byPlayer, r.pass_defense_2_player_id, r.pass_defense_2_player_name, "passesDefended", 1, key);
  }
  return byPlayer;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// "1 sack" not "1 sacks" — only the labels that are plain plurals
// ("sacks", "QB hits") need this; "TFL"/"INT"/"PBU" are already
// count-invariant abbreviations.
function label(n: number, plural: string): string {
  return n === 1 && plural.endsWith("s") ? plural.slice(0, -1) : plural;
}

// A real stat-line summary for one position group: this group's team
// total on its two most relevant counting stats, plus whoever's leading
// the primary one by name (real roster name, not pbp's abbreviated
// "G.Jacas" form). Empty string when nobody on the roster has logged the
// primary stat yet (early season, or a group that hasn't produced).
export function defensiveGroupStatLine(
  playerStats: Map<string, DefensivePlayerLine>,
  rosterByGsis: Map<string, RosterRow>,
  // null = the whole defense. The Pass Rush, Run Defense and Pass Defense
  // cards are team-wide grades, and their stat lines once counted only one
  // position group — "4 sacks" beside a team that had 7.
  depthChartPositions: string[] | null,
  primaryMetric: CountField,
  primaryLabel: string,
  secondaryMetric: CountField,
  secondaryLabel: string
): string {
  const groupLines = [...playerStats.values()].filter(
    (l) =>
      depthChartPositions === null ||
      depthChartPositions.includes(rosterByGsis.get(l.playerId)?.depth_chart_position ?? "")
  );
  if (groupLines.length === 0) return "";
  const totalPrimary = groupLines.reduce((sum, l) => sum + l[primaryMetric], 0);
  const totalSecondary = groupLines.reduce((sum, l) => sum + l[secondaryMetric], 0);
  if (totalPrimary === 0 && totalSecondary === 0) return "";
  const leader = [...groupLines].sort((a, b) => b[primaryMetric] - a[primaryMetric])[0];
  const leaderName = rosterByGsis.get(leader.playerId)?.full_name ?? leader.playerName;
  const leaderText =
    leader[primaryMetric] > 0
      ? ` — leader: ${leaderName} (${fmt(leader[primaryMetric])} ${label(leader[primaryMetric], primaryLabel)})`
      : "";
  return `${fmt(totalPrimary)} ${primaryLabel}, ${fmt(totalSecondary)} ${secondaryLabel}${leaderText}`;
}
