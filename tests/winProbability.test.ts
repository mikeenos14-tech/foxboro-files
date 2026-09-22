import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  simpleWinProb,
  winProbFromSpread,
  blendedWinProb,
  normalCdf,
  WIN_PROB_FLOOR,
  WIN_PROB_CEILING,
} from "../scripts/lib/winProbability";

describe("normalCdf", () => {
  test("is 0.5 at zero and symmetric about it", () => {
    assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-4);
    assert.ok(Math.abs(normalCdf(1) + normalCdf(-1) - 1) < 1e-4);
  });

  test("matches known values", () => {
    assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 1e-3);
    assert.ok(Math.abs(normalCdf(-1.645) - 0.05) < 1e-3);
  });
});

describe("winProbFromSpread", () => {
  test("a pick'em game is a coin flip", () => {
    assert.ok(Math.abs(winProbFromSpread(0) - 0.5) < 1e-4);
  });

  test("being favored (negative spread) means more than 50%", () => {
    // Sign convention matters here and is easy to invert silently —
    // positive means we're getting points.
    assert.ok(winProbFromSpread(-7) > 0.5);
    assert.ok(winProbFromSpread(3) < 0.5);
  });

  test("a 3-point underdog lands in a plausible range", () => {
    const p = winProbFromSpread(3);
    assert.ok(p > 0.38 && p < 0.45, `expected ~0.41, got ${p}`);
  });

  test("bigger spreads move further from even in the right direction", () => {
    assert.ok(winProbFromSpread(-14) > winProbFromSpread(-7));
    assert.ok(winProbFromSpread(14) < winProbFromSpread(7));
  });
});

describe("simpleWinProb", () => {
  test("an even matchup on the road is just under even", () => {
    assert.ok(simpleWinProb(0, false) < 0.5);
    assert.ok(simpleWinProb(0, true) > 0.5);
  });

  test("never escapes the clamp, however lopsided the input", () => {
    assert.equal(simpleWinProb(99, true), WIN_PROB_CEILING);
    assert.equal(simpleWinProb(-99, false), WIN_PROB_FLOOR);
  });

  test("rises with EPA differential", () => {
    assert.ok(simpleWinProb(0.3, true) > simpleWinProb(0.1, true));
  });
});

describe("blendedWinProb", () => {
  test("with no market line the model estimate passes through untouched", () => {
    assert.equal(blendedWinProb(0.62, undefined), 0.62);
  });

  test("a market line pulls the estimate toward what the market says", () => {
    // Model likes us at 50%, market has us as a 3-point dog: the blend
    // must land between the two, nearer neither extreme.
    const model = 0.5;
    const blended = blendedWinProb(model, 3);
    const market = winProbFromSpread(3);
    assert.ok(blended < model, "should be dragged down by an underdog line");
    assert.ok(blended > market, "should not fully become the market");
  });

  test("is exactly the midpoint of model and market", () => {
    const blended = blendedWinProb(0.5, 3);
    assert.ok(Math.abs(blended - (0.5 + winProbFromSpread(3)) / 2) < 1e-12);
  });

  test("stays inside the clamp even with an extreme line", () => {
    assert.ok(blendedWinProb(0.9, -40) <= WIN_PROB_CEILING);
    assert.ok(blendedWinProb(0.1, 40) >= WIN_PROB_FLOOR);
  });
});
