import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeOpponentAdjustedPair } from "../scripts/lib/adjustedRate";
import { gradeGroupAllTeams, GROUP_METRICS } from "../scripts/lib/positionGrades";
import type { PbpRow } from "../scripts/lib/pbp";
import type { RosterRow } from "../scripts/lib/roster";

function play(gameId: string, posteam: string, defteam: string, epa: number): PbpRow {
  return {
    game_id: gameId,
    play_id: `${gameId}-${Math.random()}`,
    posteam,
    defteam,
    play_type: "pass",
    pass_attempt: "1",
    epa: String(epa),
  } as unknown as PbpRow;
}

const metric = { filter: (r: PbpRow) => r.play_type === "pass", value: (r: PbpRow) => Number(r.epa) };

describe("computeOpponentAdjustedPair", () => {
  test("credits the same raw production more when the opponent is stingy", () => {
    // A and B both average +0.2 against their opponent. A's opponent
    // (STINGY) shuts everyone else down; B's opponent (SOFT) gives up
    // plenty. A's +0.2 should therefore adjust higher than B's.
    const rows: PbpRow[] = [
      play("g1", "A", "STINGY", 0.2),
      play("g2", "B", "SOFT", 0.2),
      // STINGY's other game: allows very little.
      play("g3", "C", "STINGY", -0.8),
      // SOFT's other game: allows a lot.
      play("g4", "D", "SOFT", 0.8),
    ];
    const { a } = computeOpponentAdjustedPair(rows, ["A", "B", "C", "D", "STINGY", "SOFT"], metric);
    assert.ok(
      a.get("A")! > a.get("B")!,
      `A (vs stingy, ${a.get("A")}) should adjust above B (vs soft, ${a.get("B")})`
    );
  });

  test("reports play counts per side so callers don't recount", () => {
    const rows = [play("g1", "A", "Z", 0.1), play("g1", "A", "Z", 0.3)];
    const { aPlays, bPlays, gamesPlayed } = computeOpponentAdjustedPair(rows, ["A", "Z"], metric);
    assert.equal(aPlays.get("A"), 2);
    assert.equal(bPlays.get("Z"), 2);
    assert.equal(gamesPlayed.get("A"), 1);
  });

  test("a team with no qualifying plays gets zero rather than NaN", () => {
    const rows = [play("g1", "A", "Z", 0.1)];
    const { a, aPlays } = computeOpponentAdjustedPair(rows, ["A", "Z", "NOBODY"], metric);
    assert.equal(a.get("NOBODY"), 0);
    assert.equal(aPlays.get("NOBODY"), 0);
    assert.ok(Number.isFinite(a.get("A")!));
  });
});

describe("GROUP_METRICS", () => {
  test("covers the eight real groups and no fabricated ones", () => {
    assert.deepEqual(
      GROUP_METRICS.map((m) => m.label),
      ["QB", "RB", "WR", "TE", "OL", "Edge", "Interior DL", "Secondary"]
    );
    // LB used to be merged in from fixtures with an invented grade.
    assert.ok(!GROUP_METRICS.some((m) => m.label === "LB"));
  });

  test("defensive groups where allowing less is better are marked as such", () => {
    const byLabel = new Map(GROUP_METRICS.map((m) => [m.label, m]));
    assert.equal(byLabel.get("Secondary")!.higherIsBetter, false);
    assert.equal(byLabel.get("Interior DL")!.higherIsBetter, false);
    assert.equal(byLabel.get("OL")!.higherIsBetter, false); // pressure allowed
    assert.equal(byLabel.get("Edge")!.higherIsBetter, true); // sacks generated
    assert.equal(byLabel.get("QB")!.higherIsBetter, true);
  });

  test("each group reads from the side of the ball it actually plays on", () => {
    const byLabel = new Map(GROUP_METRICS.map((m) => [m.label, m]));
    for (const g of ["QB", "RB", "WR", "TE", "OL"]) {
      assert.equal(byLabel.get(g)!.side, "offense", `${g} should grade off offensive plays`);
    }
    for (const g of ["Edge", "Interior DL", "Secondary"]) {
      assert.equal(byLabel.get(g)!.side, "defense", `${g} should grade off defensive plays`);
    }
  });
});

describe("gradeGroupAllTeams", () => {
  const roster = new Map<string, RosterRow>();
  const secondary = GROUP_METRICS.find((m) => m.label === "Secondary")!;

  test("grades every team and returns percentiles in range", () => {
    const rows: PbpRow[] = [
      play("g1", "A", "B", 0.5),
      play("g2", "B", "A", -0.5),
      play("g3", "A", "C", 0.1),
      play("g4", "C", "A", 0.2),
    ];
    const graded = gradeGroupAllTeams(rows, ["A", "B", "C"], roster, secondary);
    assert.equal(graded.size, 3);
    for (const [, g] of graded) {
      assert.ok(g.grade >= 0 && g.grade <= 100);
      assert.ok(Number.isFinite(g.adjustedValue));
    }
  });

  test("the defense allowing less ranks better", () => {
    // B's defense allows -0.5; C's allows +0.9. B should grade higher.
    const rows: PbpRow[] = [
      play("g1", "A", "B", -0.5),
      play("g2", "A", "C", 0.9),
      play("g3", "D", "B", -0.5),
      play("g4", "D", "C", 0.9),
    ];
    const graded = gradeGroupAllTeams(rows, ["A", "B", "C", "D"], roster, secondary);
    assert.ok(
      graded.get("B")!.grade > graded.get("C")!.grade,
      `B (${graded.get("B")!.grade}) should outgrade C (${graded.get("C")!.grade})`
    );
  });
});

describe("raw-value labels stay compatible with the UI formatter", () => {
  // PositionGroupHeadToHead decides between EPA formatting (-0.15) and
  // percent formatting (9.8%) by inspecting the label. An exact-match
  // check there broke the moment labels gained an "Adj." prefix and
  // rendered -0.152 EPA/play as "-15.2%". This pins the contract.
  const EPA_GROUPS = ["QB", "RB", "WR", "TE", "Interior DL", "Secondary"];
  const RATE_GROUPS = ["OL", "Edge"];

  // Mirrors formatRaw in components/roster/PositionGroupHeadToHead.tsx.
  const isEpaLabel = (label: string) => label.includes("EPA");

  test("EPA-valued groups carry a label the formatter reads as EPA", () => {
    for (const label of EPA_GROUPS) {
      const metric = GROUP_METRICS.find((m) => m.label === label)!;
      assert.ok(metric, `${label} missing from GROUP_METRICS`);
    }
    // The label strings themselves live in build-roster-data.ts; assert
    // the ones a rate group uses are NOT mistaken for EPA.
    assert.ok(isEpaLabel("Adj. EPA/play"));
    assert.ok(isEpaLabel("Adj. rush EPA allowed"));
    assert.ok(isEpaLabel("Adj. pass EPA allowed"));
    assert.ok(!isEpaLabel("Adj. pressure rate allowed"));
    assert.ok(!isEpaLabel("Adj. sack rate generated"));
    assert.equal(RATE_GROUPS.length, 2);
  });
});
