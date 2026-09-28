import test from "node:test";
import assert from "node:assert/strict";
import { toPlayRecord } from "../scripts/lib/playRecords";

const row = (o: Record<string, string>) => ({
  game_id: "2026_03_NE_JAX", play_id: "1298", week: "3", home_team: "JAX", away_team: "NE",
  qtr: "2", time: "09:20", down: "3", ydstogo: "6", yrdln: "JAX 17", goal_to_go: "0",
  posteam: "NE", defteam: "JAX", desc: "(9:20) pass incomplete", yards_gained: "0", epa: "-0.87",
  ...o,
});

test("labels the situation the way a broadcast does", () => {
  const p = toPlayRecord(row({}), "NE");
  assert.equal(p.situation, "3rd & 6 at JAX 17");
  assert.equal(p.clock, "9:20");
  assert.equal(p.opponent, "JAX");
  assert.equal(toPlayRecord(row({ down: "1", goal_to_go: "1", ydstogo: "4", yrdln: "JAX 4" }), "NE").situation, "1st & Goal at JAX 4");
  assert.equal(toPlayRecord(row({ down: "NA" }), "NE").situation, "");
});

test("EPA is shown from New England's side on defense too", () => {
  assert.equal(toPlayRecord(row({}), "NE").neEpa, -0.87);
  assert.equal(toPlayRecord(row({ posteam: "JAX", defteam: "NE", epa: "-0.87" }), "NE").neEpa, 0.87);
  assert.equal(toPlayRecord(row({ epa: "NA" }), "NE").neEpa, null);
});
