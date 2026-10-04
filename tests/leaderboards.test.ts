import { test } from "node:test";
import assert from "node:assert/strict";
import { isCarryFor, isTargetFor } from "../scripts/lib/leaderboards";
import type { PbpRow } from "../scripts/lib/pbp";

// nflverse's official totals exclude two-point tries from targets and
// carries, the same way they exclude them from pass attempts. The first
// NE two-point pass of 2026 put Stevenson at 17 targets against
// nflverse's 16, which failed the post-game refresh.
const play = (over: Partial<PbpRow>): PbpRow =>
  ({
    posteam: "NE",
    play_type: "pass",
    pass_attempt: "1",
    two_point_attempt: "0",
    receiver_player_id: "00-0036875",
    rusher_player_id: "",
    ...over,
  }) as PbpRow;

test("a two-point pass isn't a target", () => {
  assert.equal(isTargetFor(play({}), "NE"), true);
  assert.equal(isTargetFor(play({ two_point_attempt: "1" }), "NE"), false);
});

test("a two-point run isn't a carry", () => {
  const run = play({ play_type: "run", pass_attempt: "0", receiver_player_id: "", rusher_player_id: "00-0036875" });
  assert.equal(isCarryFor(run, "NE"), true);
  assert.equal(isCarryFor({ ...run, two_point_attempt: "1" }, "NE"), false);
});
