import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { rankGeneric } from "../scripts/lib/rank";
import { trendFor } from "../scripts/lib/trend";

const TEAMS = ["AAA", "BBB", "CCC", "DDD"];
const VALUES: Record<string, number> = { AAA: 1.0, BBB: 0.5, CCC: 0.0, DDD: -0.5 };
const valueOf = (t: string) => VALUES[t];

describe("rankGeneric", () => {
  test("rank 1 is the highest value when higher is better", () => {
    assert.equal(rankGeneric(TEAMS, "AAA", valueOf, true).leagueRank, 1);
    assert.equal(rankGeneric(TEAMS, "DDD", valueOf, true).leagueRank, 4);
  });

  test("rank 1 is the LOWEST value when lower is better", () => {
    // Defensive stats rely on this inversion — leagueRank must always
    // mean "best", never "biggest", or every defensive rank badge on the
    // site is backwards.
    assert.equal(rankGeneric(TEAMS, "DDD", valueOf, false).leagueRank, 1);
    assert.equal(rankGeneric(TEAMS, "AAA", valueOf, false).leagueRank, 4);
  });

  test("percentile is 100 for the best and 0 for the worst, either direction", () => {
    assert.equal(rankGeneric(TEAMS, "AAA", valueOf, true).leaguePercentile, 100);
    assert.equal(rankGeneric(TEAMS, "DDD", valueOf, true).leaguePercentile, 0);
    assert.equal(rankGeneric(TEAMS, "DDD", valueOf, false).leaguePercentile, 100);
  });

  test("reports the team's own raw value untouched", () => {
    assert.equal(rankGeneric(TEAMS, "BBB", valueOf, true).value, 0.5);
  });

  test("a team missing from the list ranks last rather than throwing", () => {
    const result = rankGeneric(TEAMS, "ZZZ", (t) => VALUES[t] ?? 0, true);
    assert.equal(result.leagueRank, TEAMS.length);
  });
});

describe("trendFor", () => {
  const w = (key: string, grade: number) => ({ key, label: key, grade });

  test("no direction without at least two windows", () => {
    assert.equal(trendFor([]), "flat");
    assert.equal(trendFor([w("last-1", 90)]), "flat");
  });

  test("a big jump in the most recent game reads as up", () => {
    // windows[0] is the most recent single game; the last entry is the
    // widest (full-season) window.
    assert.equal(trendFor([w("last-1", 80), w("last-2", 50)]), "up");
  });

  test("a big drop reads as down", () => {
    assert.equal(trendFor([w("last-1", 20), w("last-2", 60)]), "down");
  });

  test("small moves stay flat rather than implying signal", () => {
    assert.equal(trendFor([w("last-1", 55), w("last-2", 50)]), "flat");
    assert.equal(trendFor([w("last-1", 45), w("last-2", 50)]), "flat");
  });

  test("the threshold is exactly 10 percentile points", () => {
    assert.equal(trendFor([w("last-1", 60), w("last-2", 50)]), "up");
    assert.equal(trendFor([w("last-1", 59), w("last-2", 50)]), "flat");
    assert.equal(trendFor([w("last-1", 40), w("last-2", 50)]), "down");
    assert.equal(trendFor([w("last-1", 41), w("last-2", 50)]), "flat");
  });

  test("compares against the widest window, not the second one", () => {
    const windows = [w("last-1", 80), w("last-2", 79), w("last-3", 50)];
    assert.equal(trendFor(windows), "up");
  });
});
