import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildVerdict } from "../lib/calc/verdict";
import type { TeamStatSnapshot } from "../lib/data/types";

function ranked(value: number, leagueRank: number) {
  return { value, leagueRank, leaguePercentile: Math.round((1 - (leagueRank - 1) / 31) * 100) };
}

// Only the three ranks buildVerdict actually reads need to be real.
function stats(offRank: number, defRank: number, diffRank = 16): TeamStatSnapshot {
  return {
    epaPerPlay: { offense: ranked(0.1, offRank), defense: ranked(-0.1, defRank) },
    pointDifferential: ranked(10, diffRank),
  } as unknown as TeamStatSnapshot;
}

describe("buildVerdict", () => {
  test("good on both sides reads as good on both sides", () => {
    const v = buildVerdict(stats(3, 5), 2, 0, 0);
    assert.match(v.headline, /both sides/);
    assert.equal(v.tone, "good");
  });

  test("bad on both sides reads as struggling", () => {
    const v = buildVerdict(stats(28, 30), 0, 2, 0);
    assert.match(v.headline, /struggling/);
    assert.equal(v.tone, "bad");
  });

  test("good defense with a poor offense names the defense as the carrier", () => {
    // This is the real NE case the element exists to describe.
    const v = buildVerdict(stats(21, 4), 1, 1, 0);
    assert.match(v.headline, /defense carrying/);
  });

  test("good offense with a poor defense inverts the framing", () => {
    const v = buildVerdict(stats(4, 26), 1, 1, 0);
    assert.match(v.headline, /offense outrunning/);
  });

  test("two middling units read as middle of the pack", () => {
    const v = buildVerdict(stats(16, 17), 1, 1, 0);
    assert.match(v.headline, /middle-of-the-pack/);
    assert.equal(v.tone, "mixed");
  });

  test("the detail is explicitly season-scoped", () => {
    // The Team Snapshot below it can be filtered to a shorter window, and
    // without this framing the same metric shows two different ranks with
    // no explanation.
    const v = buildVerdict(stats(21, 4), 1, 1, 0);
    assert.match(v.detail, /^On the season/);
  });

  test("the record appears in the detail, including ties", () => {
    assert.match(buildVerdict(stats(10, 10), 2, 1, 0).detail, /2-1\b/);
    assert.match(buildVerdict(stats(10, 10), 2, 1, 1).detail, /2-1-1\b/);
  });

  test("ordinal suffixes are correct, including the teens", () => {
    assert.match(buildVerdict(stats(1, 2), 1, 0, 0).detail, /1st in EPA\/play/);
    assert.match(buildVerdict(stats(2, 3), 1, 0, 0).detail, /2nd in EPA\/play/);
    assert.match(buildVerdict(stats(3, 4), 1, 0, 0).detail, /3rd in EPA\/play/);
    assert.match(buildVerdict(stats(11, 12), 1, 0, 0).detail, /11th in EPA\/play/);
    assert.match(buildVerdict(stats(12, 13), 1, 0, 0).detail, /12th in EPA\/play/);
    assert.match(buildVerdict(stats(13, 14), 1, 0, 0).detail, /13th in EPA\/play/);
    assert.match(buildVerdict(stats(21, 22), 1, 0, 0).detail, /21st in EPA\/play/);
  });

  test("describes a top-5 unit as elite and a bottom unit as among the worst", () => {
    assert.match(buildVerdict(stats(2, 30), 1, 0, 0).detail, /elite offense/);
    assert.match(buildVerdict(stats(2, 30), 1, 0, 0).detail, /among the worst in the league defense/);
  });
});
