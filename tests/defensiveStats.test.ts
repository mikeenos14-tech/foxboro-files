import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeDefensivePlayerStats, defensiveGroupStatLine } from "../scripts/lib/defensiveStats";
import { pressureRateAllowed, olFaultSackRateAllowed } from "../scripts/lib/pbp";
import type { PbpRow } from "../scripts/lib/pbp";
import type { RosterRow } from "../scripts/lib/roster";

function row(overrides: Partial<Record<string, string>>): PbpRow {
  return {
    game_id: "G1",
    play_id: "1",
    posteam: "OPP",
    defteam: "NE",
    pass_attempt: "0",
    sack: "0",
    qb_hit: "0",
    ...overrides,
  } as unknown as PbpRow;
}

function rosterEntry(id: string, name: string, pos: string): [string, RosterRow] {
  return [id, { gsis_id: id, full_name: name, depth_chart_position: pos } as unknown as RosterRow];
}

describe("computeDefensivePlayerStats", () => {
  test("a full sack counts 1 and each half sack counts 0.5", () => {
    const stats = computeDefensivePlayerStats(
      [
        row({ play_id: "1", sack_player_id: "P1", sack_player_name: "A" }),
        row({ play_id: "2", half_sack_1_player_id: "P2", half_sack_1_player_name: "B", half_sack_2_player_id: "P3", half_sack_2_player_name: "C" }),
      ],
      "NE"
    );
    assert.equal(stats.get("P1")!.sacks, 1);
    assert.equal(stats.get("P2")!.sacks, 0.5);
    assert.equal(stats.get("P3")!.sacks, 0.5);
  });

  test("ignores plays where the team wasn't on defense", () => {
    const stats = computeDefensivePlayerStats(
      [row({ defteam: "BUF", sack_player_id: "P1", sack_player_name: "A" })],
      "NE"
    );
    assert.equal(stats.size, 0);
  });

  test("a forced fumble only counts for the team that forced it", () => {
    // forced_fumble_player_N_team is the forcer's own team, which is a
    // genuinely easy thing to get backwards.
    const stats = computeDefensivePlayerStats(
      [
        row({
          play_id: "1",
          forced_fumble_player_1_team: "NE",
          forced_fumble_player_1_player_id: "P1",
          forced_fumble_player_1_player_name: "A",
        }),
        row({
          play_id: "2",
          forced_fumble_player_1_team: "BUF",
          forced_fumble_player_1_player_id: "P9",
          forced_fumble_player_1_player_name: "Z",
        }),
      ],
      "NE"
    );
    assert.equal(stats.get("P1")!.forcedFumbles, 1);
    assert.equal(stats.get("P9"), undefined);
  });

  test("accumulates several stat types for one player across plays", () => {
    const stats = computeDefensivePlayerStats(
      [
        row({ play_id: "1", qb_hit_1_player_id: "P1", qb_hit_1_player_name: "A" }),
        row({ play_id: "2", qb_hit_1_player_id: "P1", qb_hit_1_player_name: "A" }),
        row({ play_id: "3", tackle_for_loss_1_player_id: "P1", tackle_for_loss_1_player_name: "A" }),
        row({ play_id: "4", interception_player_id: "P1", interception_player_name: "A" }),
        row({ play_id: "5", pass_defense_1_player_id: "P1", pass_defense_1_player_name: "A" }),
      ],
      "NE"
    );
    const p = stats.get("P1")!;
    assert.equal(p.qbHits, 2);
    assert.equal(p.tfl, 1);
    assert.equal(p.interceptions, 1);
    assert.equal(p.passesDefended, 1);
  });
});

describe("defensiveGroupStatLine", () => {
  const roster = new Map([rosterEntry("P1", "Gabe Jacas", "OLB"), rosterEntry("P2", "Milton Williams", "DT")]);

  test("totals only the requested depth-chart positions", () => {
    const stats = computeDefensivePlayerStats(
      [
        row({ play_id: "1", sack_player_id: "P1", sack_player_name: "A" }),
        row({ play_id: "2", sack_player_id: "P2", sack_player_name: "B" }),
      ],
      "NE"
    );
    const line = defensiveGroupStatLine(stats, roster, ["OLB"], "sacks", "sacks", "qbHits", "QB hits");
    assert.match(line, /^1 sacks/);
    assert.match(line, /Gabe Jacas/);
    assert.doesNotMatch(line, /Milton Williams/);
  });

  test("uses the real roster name, not the abbreviated play-by-play one", () => {
    const stats = computeDefensivePlayerStats(
      [row({ play_id: "1", sack_player_id: "P1", sack_player_name: "G.Jacas" })],
      "NE"
    );
    const line = defensiveGroupStatLine(stats, roster, ["OLB"], "sacks", "sacks", "qbHits", "QB hits");
    assert.match(line, /Gabe Jacas/);
    assert.doesNotMatch(line, /G\.Jacas/);
  });

  test("says 'sack' not 'sacks' when the leader has exactly one", () => {
    const stats = computeDefensivePlayerStats(
      [row({ play_id: "1", sack_player_id: "P1", sack_player_name: "A" })],
      "NE"
    );
    const line = defensiveGroupStatLine(stats, roster, ["OLB"], "sacks", "sacks", "qbHits", "QB hits");
    assert.match(line, /\(1 sack\)/);
  });

  test("returns empty rather than a line of zeroes when nothing was produced", () => {
    const stats = computeDefensivePlayerStats([], "NE");
    assert.equal(defensiveGroupStatLine(stats, roster, ["OLB"], "sacks", "sacks", "qbHits", "QB hits"), "");
  });
});

describe("pressureRateAllowed", () => {
  const dropback = (o: Partial<Record<string, string>>) =>
    row({ posteam: "NE", defteam: "OPP", pass_attempt: "1", ...o });

  test("counts a play once even when it is both a sack and a QB hit", () => {
    // The whole reason this is an OR over plays rather than a sum of two
    // counts — sacks are usually also flagged qb_hit.
    const rows = [
      dropback({ play_id: "1", sack: "1", qb_hit: "1" }),
      dropback({ play_id: "2" }),
      dropback({ play_id: "3" }),
      dropback({ play_id: "4" }),
    ];
    assert.equal(pressureRateAllowed(rows, "NE"), 0.25);
  });

  test("counts a QB hit that didn't end in a sack", () => {
    const rows = [dropback({ play_id: "1", qb_hit: "1" }), dropback({ play_id: "2" })];
    assert.equal(pressureRateAllowed(rows, "NE"), 0.5);
  });

  test("is zero when there are no dropbacks at all", () => {
    assert.equal(pressureRateAllowed([], "NE"), 0);
  });
});

describe("olFaultSackRateAllowed", () => {
  const dropback = (o: Partial<Record<string, string>>) =>
    row({ posteam: "NE", defteam: "OPP", pass_attempt: "1", ...o });

  test("excludes sacks charted as the QB's own fault", () => {
    const rows = [
      dropback({ play_id: "1", sack: "1" }),
      dropback({ play_id: "2", sack: "1" }),
      dropback({ play_id: "3" }),
      dropback({ play_id: "4" }),
    ];
    const qbFault = new Set(["G1|2"]);
    assert.equal(olFaultSackRateAllowed(rows, "NE", qbFault), 0.25);
  });

  test("an unmatched sack still counts against the line", () => {
    // Absence of charting evidence must not become evidence of absence,
    // or missing FTN data would silently flatter every offensive line.
    const rows = [dropback({ play_id: "1", sack: "1" }), dropback({ play_id: "2" })];
    assert.equal(olFaultSackRateAllowed(rows, "NE", new Set()), 0.5);
  });
});
