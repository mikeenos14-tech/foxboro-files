import test from "node:test";
import assert from "node:assert/strict";
import { ngsRank } from "../scripts/lib/ngs";

const row = (id: string, value: string) => ({
  season: "2026",
  season_type: "REG",
  week: "0",
  player_gsis_id: id,
  team_abbr: "NE",
  avg_time_to_throw: value,
});

test("ranks among the qualified players given, 1 = highest value", () => {
  const rows = [row("a", "2.5"), row("b", "3.04"), row("c", "2.8"), row("d", "3.2")];
  assert.deepEqual(ngsRank(rows, "b", "avg_time_to_throw"), { value: 3.04, rank: 2, of: 4 });
  assert.deepEqual(ngsRank(rows, "a", "avg_time_to_throw"), { value: 2.5, rank: 4, of: 4 });
});

test("ties share the better rank", () => {
  const rows = [row("a", "3.0"), row("b", "3.0"), row("c", "2.0")];
  assert.equal(ngsRank(rows, "b", "avg_time_to_throw")?.rank, 1);
});

test("a player under NGS's minimums isn't ranked at all", () => {
  assert.equal(ngsRank([row("a", "3.0")], "zzz", "avg_time_to_throw"), null);
  assert.equal(ngsRank([row("a", "NA")], "a", "avg_time_to_throw"), null);
});
