import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  blendWithPrior,
  PHASE_OUT_GAMES,
  OPPONENT_BASELINE_SHRINK_GAMES,
} from "../scripts/lib/priorBlend";

describe("blendWithPrior", () => {
  const PRIOR = 1.0;
  const CURRENT = 0.0;

  test("with no games played the prior is all there is", () => {
    assert.equal(blendWithPrior(PRIOR, CURRENT, 0), PRIOR);
  });

  test("at the phase-out point the prior is fully gone", () => {
    assert.equal(blendWithPrior(PRIOR, CURRENT, PHASE_OUT_GAMES), CURRENT);
  });

  test("past the phase-out point it stays gone rather than going negative", () => {
    // Math.max(0, ...) guards this — without it the prior weight would go
    // negative and start pushing the estimate away from the current value.
    assert.equal(blendWithPrior(PRIOR, CURRENT, PHASE_OUT_GAMES * 3), CURRENT);
  });

  test("halfway through the taper is a 50/50 split", () => {
    const result = blendWithPrior(PRIOR, CURRENT, PHASE_OUT_GAMES / 2);
    assert.ok(Math.abs(result - 0.5) < 1e-12);
  });

  test("two games in is a 50/50 split, which is the point of the 4-game taper", () => {
    // Regression guard on the constant itself: at the previous value of 8
    // this was 75% prior, which is what made the site read last year's
    // roster over this year's results.
    assert.equal(PHASE_OUT_GAMES, 4);
    assert.ok(Math.abs(blendWithPrior(PRIOR, CURRENT, 2) - 0.5) < 1e-12);
  });

  test("the prior's weight decreases monotonically", () => {
    let previous = Infinity;
    for (let g = 0; g <= PHASE_OUT_GAMES; g++) {
      const value = blendWithPrior(PRIOR, CURRENT, g);
      assert.ok(value <= previous, `weight rose at game ${g}`);
      previous = value;
    }
  });

  test("an explicit phaseOutGames overrides the default", () => {
    // The opponent-baseline shrinkage shares this function but must taper
    // on its own schedule — changing one must not silently change the
    // other.
    assert.notEqual(OPPONENT_BASELINE_SHRINK_GAMES, PHASE_OUT_GAMES);
    const atDefault = blendWithPrior(PRIOR, CURRENT, 4);
    const atOverride = blendWithPrior(PRIOR, CURRENT, 4, OPPONENT_BASELINE_SHRINK_GAMES);
    assert.equal(atDefault, CURRENT);
    assert.ok(atOverride > CURRENT, "override should still carry prior weight at 4 games");
  });
});
