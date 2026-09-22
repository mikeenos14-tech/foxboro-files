import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  leagueMean,
  shrink,
  sampleConfidence,
  confidenceLabel,
  SHRINK_K,
} from "../scripts/lib/shrink";

describe("leagueMean", () => {
  test("weights by play count, not by team", () => {
    // Mean-of-means would be 0.5. Plays-weighted, the 90-play sample at
    // 0.0 should dominate the 10-play sample at 1.0.
    const mean = leagueMean([
      { value: 1.0, n: 10 },
      { value: 0.0, n: 90 },
    ]);
    assert.equal(mean, 0.1);
  });

  test("returns 0 when there are no plays at all", () => {
    assert.equal(leagueMean([{ value: 5, n: 0 }]), 0);
    assert.equal(leagueMean([]), 0);
  });
});

describe("shrink", () => {
  const MEAN = 0.2;

  test("a zero-play sample collapses entirely to the league mean", () => {
    assert.equal(shrink({ value: 99, n: 0 }, MEAN, SHRINK_K.receivingEpa), MEAN);
  });

  test("at n === K the estimate sits exactly halfway to the mean", () => {
    const k = SHRINK_K.receivingEpa;
    const result = shrink({ value: 1.0, n: k }, MEAN, k);
    assert.ok(Math.abs(result - (1.0 + MEAN) / 2) < 1e-12);
  });

  test("a large sample is barely moved", () => {
    const result = shrink({ value: 1.0, n: 5000 }, MEAN, SHRINK_K.receivingEpa);
    assert.ok(result > 0.99, `expected ~1.0, got ${result}`);
  });

  test("always pulls toward the mean, never past it", () => {
    const above = shrink({ value: 1.0, n: 20 }, MEAN, 40);
    assert.ok(above < 1.0 && above > MEAN);

    const below = shrink({ value: -1.0, n: 20 }, MEAN, 40);
    assert.ok(below > -1.0 && below < MEAN);
  });

  test("a thinner sample is pulled harder than a thicker one", () => {
    // This is the whole point of the correction: it must differentiate by
    // sample size, otherwise it's a no-op on the rankings.
    const thin = shrink({ value: 1.0, n: 8 }, MEAN, 40);
    const thick = shrink({ value: 1.0, n: 40 }, MEAN, 40);
    assert.ok(thin < thick, `thin (${thin}) should be pulled below thick (${thick})`);
  });

  test("a thin extreme can be overtaken by a thicker moderate value", () => {
    // The real-world case: JAX at 8 targets with a gaudy raw number
    // should not outrank a team with three times the sample and a
    // merely-good one.
    const thinExtreme = shrink({ value: 0.90, n: 8 }, MEAN, 40);
    const thickGood = shrink({ value: 0.55, n: 40 }, MEAN, 40);
    assert.ok(thickGood > thinExtreme, `${thickGood} should exceed ${thinExtreme}`);
  });
});

describe("sampleConfidence / confidenceLabel", () => {
  test("confidence rises with sample size and stays within 0-1", () => {
    const k = SHRINK_K.teamRate;
    assert.equal(sampleConfidence(0, k), 0);
    assert.ok(sampleConfidence(10, k) < sampleConfidence(100, k));
    assert.ok(sampleConfidence(1e6, k) < 1);
  });

  test("a 10-target TE sample is labelled low", () => {
    assert.equal(confidenceLabel(10, SHRINK_K.receivingEpa), "low");
  });

  test("a full season of targets is labelled high", () => {
    assert.equal(confidenceLabel(136, SHRINK_K.receivingEpa), "high");
  });

  test("labels are ordered low -> medium -> high as n grows", () => {
    const k = SHRINK_K.receivingEpa;
    const order = { low: 0, medium: 1, high: 2 };
    let previous = -1;
    for (const n of [1, 10, 25, 40, 70, 200, 1000]) {
      const rank = order[confidenceLabel(n, k)];
      assert.ok(rank >= previous, `confidence went backwards at n=${n}`);
      previous = rank;
    }
  });
});
