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

test("a lateral splits the yards the way the official totals do", async () => {
  const { receivingLeaders } = await import("../scripts/lib/leaderboards");
  const chism = "00-0040001";
  const henderson = "00-0040734";
  const pbp = [
    // Henderson's own catch, so he's on the board.
    play({ receiver_player_id: henderson, complete_pass: "1", receiving_yards: "6", yards_gained: "6" }),
    // Chism catches for 4, laterals to Henderson for 12 more.
    play({
      receiver_player_id: chism, complete_pass: "1", receiving_yards: "4", yards_gained: "16",
      lateral_reception: "1", lateral_receiver_player_id: henderson, lateral_receiving_yards: "12",
    }),
  ];
  const board = receivingLeaders(pbp, new Map(), "NE");
  const yds = (id: string) => board.find((l) => l.playerId === id)?.stats.find((s) => s.label === "Yds")?.value;
  assert.equal(yds(chism), "4");
  assert.equal(yds(henderson), "18");
});

test("a lateral touchdown goes to the player who scored", async () => {
  const { receivingLeaders } = await import("../scripts/lib/leaderboards");
  const evans = "00-0031408";
  const samuel = "00-0035719";
  const pbp = [
    play({ receiver_player_id: samuel, complete_pass: "1", receiving_yards: "5", yards_gained: "5" }),
    play({
      receiver_player_id: evans, complete_pass: "1", receiving_yards: "2", yards_gained: "82", pass_touchdown: "1",
      td_player_id: samuel, lateral_reception: "1", lateral_receiver_player_id: samuel, lateral_receiving_yards: "80",
    }),
  ];
  const board = receivingLeaders(pbp, new Map(), "NE");
  const td = (id: string) => board.find((l) => l.playerId === id)?.stats.find((s) => s.label === "TD")?.value;
  assert.equal(td(evans), "0");
  assert.equal(td(samuel), "1");
});

test("an aborted snap is the carry of whoever picked it up", async () => {
  const { rusherId } = await import("../scripts/lib/playerIds");
  // Center fumbles the snap; the QB recovers and runs.
  assert.equal(rusherId(play({ rusher_id: "00-center", rusher_player_id: "00-qb" })), "00-qb");
  // A scramble leaves the short column empty.
  assert.equal(rusherId(play({ rusher_id: "", rusher_player_id: "00-qb" })), "00-qb");
});

test("a traded player's season line adds up both teams", async () => {
  const { seasonLines } = await import("../scripts/lib/seasonLines");
  const mhj = "00-0039337";
  const pbp = [
    { ...play({ receiver_player_id: mhj, complete_pass: "1", receiving_yards: "40", yards_gained: "40" }), posteam: "ARI" },
    { ...play({ receiver_player_id: mhj, complete_pass: "0", receiving_yards: "", yards_gained: "0" }), posteam: "ARI" },
    { ...play({ receiver_player_id: mhj, complete_pass: "1", receiving_yards: "34", yards_gained: "34" }), posteam: "HOU" },
  ];
  const line = seasonLines(pbp, "receiving").get(mhj);
  assert.deepEqual(line?.teams.sort(), ["ARI", "HOU"]);
  assert.equal(line?.numbers["Rec"], 2);
  assert.equal(line?.numbers["Rec#2"], 3);
  assert.equal(line?.numbers["Yds"], 74);
});
