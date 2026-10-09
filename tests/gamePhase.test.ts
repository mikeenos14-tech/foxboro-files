import { test } from "node:test";
import assert from "node:assert/strict";
import { gamePhase } from "../lib/calc/gamePhase";

// Week 4 at BUF, Sun Oct 4 2026, 1:00 PM ET (17:00 UTC). Week 5 vs LV, Sun Oct 11.
const lastGame = { date: "2026-10-04", kickoffTimeEt: "13:00", hasResult: true };
const nextGame = { date: "2026-10-11", kickoffTimeEt: "13:00" };
const at = (iso: string) => new Date(iso);

test("the day after a game leads with the result", () => {
  assert.equal(gamePhase(at("2026-10-05T12:00:00Z"), nextGame, lastGame), "postgame");
});

test("a day and a half later it's back to the next game", () => {
  assert.equal(gamePhase(at("2026-10-06T06:00:00Z"), nextGame, lastGame), "upcoming");
  assert.equal(gamePhase(at("2026-10-08T15:00:00Z"), nextGame, lastGame), "upcoming");
});

test("game day means the Eastern calendar day, not 'within 24 hours'", () => {
  // 11pm ET Saturday is still Saturday.
  assert.equal(gamePhase(at("2026-10-11T03:00:00Z"), nextGame, lastGame), "upcoming");
  // 9am ET Sunday.
  assert.equal(gamePhase(at("2026-10-11T13:00:00Z"), nextGame, lastGame), "gameday");
});

test("during the game, then waiting for the data", () => {
  assert.equal(gamePhase(at("2026-10-11T18:00:00Z"), nextGame, lastGame), "live");
  // 6pm ET, game over, the refresh hasn't moved "next game" on yet.
  assert.equal(gamePhase(at("2026-10-11T22:00:00Z"), nextGame, lastGame), "awaiting");
});

test("no result yet means no postgame card", () => {
  assert.equal(gamePhase(at("2026-10-05T12:00:00Z"), nextGame, { ...lastGame, hasResult: false }), "upcoming");
});
