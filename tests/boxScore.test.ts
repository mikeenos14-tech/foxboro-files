import test from "node:test";
import assert from "node:assert/strict";
import { isOfficialPassAttempt, passingLine } from "../scripts/lib/boxScore";

type Row = Record<string, string>;

// nflverse sets pass_attempt = 1 on every dropback, sacks and two-point
// tries included — these rows mirror how the real file encodes each.
function play(opts: Partial<Row>): Row {
  return {
    pass_attempt: "1",
    sack: "0",
    two_point_attempt: "0",
    complete_pass: "0",
    passing_yards: "NA",
    yards_gained: "0",
    pass_touchdown: "0",
    interception: "0",
    ...opts,
  };
}

const completion = (yds: number) =>
  play({ complete_pass: "1", passing_yards: String(yds), yards_gained: String(yds) });
const sack = (lost: number) => play({ sack: "1", yards_gained: String(-lost) });

test("a sack is a dropback, not a pass attempt", () => {
  assert.equal(isOfficialPassAttempt(sack(8)), false);
  assert.equal(isOfficialPassAttempt(completion(12)), true);
});

test("a two-point try doesn't count toward the box score", () => {
  assert.equal(isOfficialPassAttempt(play({ two_point_attempt: "1", complete_pass: "1" })), false);
});

test("spikes and throwaways still count as attempts, as the NFL counts them", () => {
  assert.equal(isOfficialPassAttempt(play({ qb_spike: "1" })), true);
});

test("sack yardage is never netted out of passing yards", () => {
  const line = passingLine([completion(20), completion(15), play({}), sack(9), sack(7)]);
  assert.deepEqual(line, { completions: 2, attempts: 3, yards: 35, tds: 0, ints: 0 });
});

test("rows that aren't pass plays at all are ignored", () => {
  const line = passingLine([play({ pass_attempt: "0", yards_gained: "6" }), completion(10)]);
  assert.equal(line.attempts, 1);
  assert.equal(line.yards, 10);
});

test("touchdowns and interceptions come from the throws", () => {
  const line = passingLine([
    play({ complete_pass: "1", passing_yards: "30", pass_touchdown: "1" }),
    play({ interception: "1" }),
    play({ two_point_attempt: "1", complete_pass: "1", pass_touchdown: "0" }),
  ]);
  assert.deepEqual(line, { completions: 1, attempts: 2, yards: 30, tds: 1, ints: 1 });
});

test("completion % rounds the way box scores do (51/80 is 63.8%, not 63.7%)", async () => {
  const { formatPercent } = await import("../lib/util/format");
  assert.equal(formatPercent(51 / 80, 1), "63.8%");
  assert.equal(formatPercent(56 / 86, 1), "65.1%");
  assert.equal(formatPercent(0.5), "50%");
});
