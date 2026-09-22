import test from "node:test";
import assert from "node:assert/strict";
import {
  reliability,
  isRankable,
  resolveGate,
  MIN_RELIABILITY,
  OPEN_RELIABILITY,
  KEEP_RELIABILITY,
} from "../scripts/lib/reliability";

// Deterministic coin flips, so "pure noise" is actually pure noise and
// the test can't flake.
function pseudoFlips(n: number, p: number, seed: number): number[] {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    out.push(s / 2147483648 < p ? 1 : 0);
  }
  return out;
}

test("teams that differ only by chance are not rankable", () => {
  // 32 teams, every one a true 90% catcher, ~24 catchable targets each —
  // the exact shape of the WR data that produced a bogus league ladder.
  const groups = Array.from({ length: 32 }, (_, i) => pseudoFlips(24, 0.9, i + 1));
  const r = reliability(groups);
  assert.ok(
    r.reliability < MIN_RELIABILITY,
    `identical teams should not be rankable, got ${r.reliability.toFixed(2)}`
  );
  assert.equal(isRankable(groups), false);
});

test("teams that genuinely differ are rankable once the sample is large", () => {
  // Real spread: true rates from 70% to 95%, and enough volume to see it.
  const groups = Array.from({ length: 32 }, (_, i) =>
    pseudoFlips(400, 0.7 + (i / 31) * 0.25, i + 1)
  );
  const r = reliability(groups);
  assert.ok(
    r.reliability >= MIN_RELIABILITY,
    `genuine spread should be rankable, got ${r.reliability.toFixed(2)}`
  );
});

test("the same genuine spread is NOT rankable on a tiny sample", () => {
  // Identical true talent to the test above — only the sample shrinks.
  // This is the point of the gate: the signal exists but hasn't
  // accumulated yet, and shrinkage alone would happily rank it anyway.
  const groups = Array.from({ length: 32 }, (_, i) =>
    pseudoFlips(8, 0.7 + (i / 31) * 0.25, i + 1)
  );
  assert.equal(isRankable(groups), false);
});

test("reliability is bounded to [0, 1] when noise exceeds observed spread", () => {
  const groups = Array.from({ length: 32 }, (_, i) => pseudoFlips(10, 0.9, i + 100));
  const r = reliability(groups);
  assert.ok(r.reliability >= 0 && r.reliability <= 1);
});

test("degenerate inputs don't throw", () => {
  assert.equal(reliability([]).reliability, 0);
  assert.equal(reliability([[]]).reliability, 0);
  assert.equal(reliability([[1, 1, 1]]).reliability, 0, "one team can't be ranked");
  // Every team identical: no observed spread at all, so nothing to rank.
  assert.equal(reliability([[1, 1], [1, 1], [1, 1]]).reliability, 0);
});

test("works for continuous values, not just rates", () => {
  // YAC per reception: same machinery, real spread, enough volume.
  const groups = Array.from({ length: 32 }, (_, i) =>
    Array.from({ length: 300 }, (_, j) => (i % 8) + ((j * 7919) % 11) - 5)
  );
  assert.equal(isRankable(groups), true);
});

// --- hysteresis -------------------------------------------------------

test("the gate needs a higher bar to open than to stay open", () => {
  assert.ok(OPEN_RELIABILITY > KEEP_RELIABILITY, "otherwise it flickers");
});

test("a rank already earned survives a noisy week", () => {
  // Reliability lands between the two thresholds — the exact band that
  // made the real 2025 replay blink on at Week 8, off at Week 10, and
  // back on at Week 14.
  const groups = Array.from({ length: 32 }, (_, i) =>
    pseudoFlips(90, 0.72 + (i / 31) * 0.2, i + 11)
  );
  const r = reliability(groups).reliability;
  assert.ok(
    r > KEEP_RELIABILITY && r < OPEN_RELIABILITY,
    `fixture must sit in the hysteresis band, got ${r.toFixed(2)}`
  );
  assert.equal(resolveGate(groups, undefined).open, false, "shouldn't open from closed");
  assert.equal(resolveGate(groups, { open: true }).open, true, "shouldn't close once open");
});

test("a genuine collapse below the keep bar does close the gate", () => {
  const noise = Array.from({ length: 32 }, (_, i) => pseudoFlips(20, 0.9, i + 1));
  assert.equal(
    resolveGate(noise, { open: true }).open,
    false,
    "hysteresis must not latch a rank open forever"
  );
});
