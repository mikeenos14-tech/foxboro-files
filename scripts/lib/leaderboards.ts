// Per-player season stat lines for the team's own roster.
//
// The site had team-level everything and exactly one player page (the
// QB). You couldn't find out who led the team in receiving yards, which
// is the first thing anyone reaches for mid-argument. Everything here
// comes from player-attribution columns already present in the
// play-by-play being fetched every run.

import { bool01, num } from "./csv";
import type { PbpRow } from "./pbp";
import type { RosterRow } from "./roster";
import { computeDefensivePlayerStats } from "./defensiveStats";
import { ftnKey, type FtnReceivingFlags } from "./receiving";

export interface PlayerStatLine {
  playerId: string;
  playerName: string;
  position: string;
  headshotUrl?: string;
  /** Ordered stat columns, already formatted for display. */
  stats: Array<{ label: string; value: string }>;
  /** The column the board is ranked by, for sorting and emphasis. */
  sortValue: number;
}

function describe(
  playerId: string,
  rosterByGsis: Map<string, RosterRow>,
  fallbackName: string
): Pick<PlayerStatLine, "playerName" | "position" | "headshotUrl"> {
  const r = rosterByGsis.get(playerId);
  return {
    playerName: r?.full_name ?? fallbackName,
    position: r?.depth_chart_position || r?.position || "",
    headshotUrl: r?.headshot_url || undefined,
  };
}

export function receivingLeaders(
  pbp: PbpRow[],
  rosterByGsis: Map<string, RosterRow>,
  team: string,
  // Optional so the board still builds if charting is unavailable; the
  // receiver-controlled columns are simply omitted in that case.
  receivingFlags?: Map<string, FtnReceivingFlags>
): PlayerStatLine[] {
  const byPlayer = new Map<
    string,
    {
      name: string;
      targets: number;
      rec: number;
      yards: number;
      tds: number;
      yac: number;
      yacN: number;
      drops: number;
      catchable: number;
      catchableCaught: number;
    }
  >();
  for (const r of pbp) {
    if (r.posteam !== team || !bool01(r.pass_attempt) || !r.receiver_id) continue;
    const cur = byPlayer.get(r.receiver_id) ?? {
      name: r.receiver || r.receiver_player_name || "",
      targets: 0,
      rec: 0,
      yards: 0,
      tds: 0,
      yac: 0,
      yacN: 0,
      drops: 0,
      catchable: 0,
      catchableCaught: 0,
    };
    cur.targets += 1;
    if (bool01(r.complete_pass)) {
      cur.rec += 1;
      cur.yards += num(r.yards_gained);
      if (r.yards_after_catch !== "" && r.yards_after_catch !== "NA") {
        cur.yac += num(r.yards_after_catch);
        cur.yacN += 1;
      }
    }
    if (bool01(r.pass_touchdown)) cur.tds += 1;
    const flags = receivingFlags?.get(ftnKey(r));
    if (flags) {
      if (flags.drop) cur.drops += 1;
      if (flags.catchable) {
        cur.catchable += 1;
        if (bool01(r.complete_pass)) cur.catchableCaught += 1;
      }
    }
    byPlayer.set(r.receiver_id, cur);
  }

  return [...byPlayer.entries()]
    .map(([playerId, v]) => ({
      playerId,
      ...describe(playerId, rosterByGsis, v.name),
      sortValue: v.yards,
      stats: [
        { label: "Rec", value: `${v.rec}/${v.targets}` },
        { label: "Yds", value: String(v.yards) },
        { label: "YAC/rec", value: v.yacN === 0 ? "—" : (v.yac / v.yacN).toFixed(1) },
        // Receiver-controlled: what he did with balls he could actually
        // catch, rather than being charged for wayward throws.
        {
          label: "Catchable",
          value: v.catchable === 0 ? "—" : `${((v.catchableCaught / v.catchable) * 100).toFixed(0)}%`,
        },
        { label: "Drops", value: String(v.drops) },
        { label: "TD", value: String(v.tds) },
      ],
    }))
    .sort((a, b) => b.sortValue - a.sortValue);
}

export function rushingLeaders(
  pbp: PbpRow[],
  rosterByGsis: Map<string, RosterRow>,
  team: string
): PlayerStatLine[] {
  const byPlayer = new Map<string, { name: string; att: number; yards: number; tds: number; fum: number }>();
  for (const r of pbp) {
    if (r.posteam !== team || r.play_type !== "run" || !r.rusher_id) continue;
    const cur = byPlayer.get(r.rusher_id) ?? {
      name: r.rusher || r.rusher_player_name || "",
      att: 0,
      yards: 0,
      tds: 0,
      fum: 0,
    };
    cur.att += 1;
    cur.yards += num(r.yards_gained);
    if (bool01(r.rush_touchdown)) cur.tds += 1;
    if (bool01(r.fumble_lost)) cur.fum += 1;
    byPlayer.set(r.rusher_id, cur);
  }

  return [...byPlayer.entries()]
    .map(([playerId, v]) => ({
      playerId,
      ...describe(playerId, rosterByGsis, v.name),
      sortValue: v.yards,
      stats: [
        { label: "Att", value: String(v.att) },
        { label: "Yds", value: String(v.yards) },
        { label: "YPC", value: v.att === 0 ? "—" : (v.yards / v.att).toFixed(1) },
        { label: "TD", value: String(v.tds) },
        { label: "FUM", value: String(v.fum) },
      ],
    }))
    .sort((a, b) => b.sortValue - a.sortValue);
}

export function defensiveLeaders(
  pbp: PbpRow[],
  rosterByGsis: Map<string, RosterRow>,
  team: string
): PlayerStatLine[] {
  const stats = computeDefensivePlayerStats(pbp, team);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return [...stats.values()]
    .map((line) => ({
      playerId: line.playerId,
      ...describe(line.playerId, rosterByGsis, line.playerName),
      // Ranked by a simple disruption count rather than one stat, so the
      // board surfaces whoever is actually affecting plays rather than
      // whoever happened to record a sack.
      sortValue: line.sacks * 2 + line.qbHits + line.tfl + line.forcedFumbles * 2 + line.interceptions * 2 + line.passesDefended,
      stats: [
        { label: "Sacks", value: fmt(line.sacks) },
        { label: "QB Hits", value: String(line.qbHits) },
        { label: "TFL", value: String(line.tfl) },
        { label: "INT", value: String(line.interceptions) },
        { label: "PBU", value: String(line.passesDefended) },
        { label: "FF", value: String(line.forcedFumbles) },
      ],
    }))
    .filter((l) => l.sortValue > 0)
    .sort((a, b) => b.sortValue - a.sortValue);
}
