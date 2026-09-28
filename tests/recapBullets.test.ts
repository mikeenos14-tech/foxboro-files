import test from "node:test";
import assert from "node:assert/strict";
import { buildRecapBullets } from "../scripts/lib/recapBullets";

const base = {
  epaPerPlay: { offense: 0, defense: 0 },
  turnoverMargin: 0,
  redZone: { offense: { att: 0, td: 0 }, defense: { att: 0, td: 0 } },
  thirdDown: { offense: { att: 0, conv: 0 }, defense: { att: 0, conv: 0 } },
  playerOfTheGame: { playerId: "", playerName: "", wpa: 0, reason: "" },
};

test("a defense holding teams under the norm is good, and says 'below' plainly", () => {
  const b = buildRecapBullets({ ...base, thirdDown: { ...base.thirdDown, defense: { att: 12, conv: 2 } } }, "PIT");
  assert.deepEqual(b.good, ["Held PIT to 2 of 12 on third down (17%), well below the 40% league norm."]);
});

test("a defense giving up conversions is bad and worded as such", () => {
  const b = buildRecapBullets({ ...base, thirdDown: { ...base.thirdDown, defense: { att: 12, conv: 8 } } }, "JAX");
  assert.match([...b.bad, ...b.ugly][0], /^Let JAX convert 8 of 12 third downs \(67%\), well above/);
});

test("close to the norm isn't called good or bad (1 of 2 red-zone trips vs 55%)", () => {
  const b = buildRecapBullets({ ...base, redZone: { ...base.redZone, offense: { att: 2, td: 1 } } }, "SEA");
  assert.deepEqual(b, { good: [], bad: [], ugly: [] });
});

test("an extreme bad becomes the Ugly", () => {
  const b = buildRecapBullets({ ...base, turnoverMargin: -3 }, "SEA");
  assert.equal(b.ugly.length, 1);
  assert.match(b.ugly[0], /Lost the turnover battle by 3/);
});

test("negative EPA allowed is good for a defense", () => {
  const b = buildRecapBullets({ ...base, epaPerPlay: { offense: 0, defense: -0.36 } }, "PIT");
  assert.match(b.good[0], /allowed -0.36 EPA per play — better than an average defense/);
});

test("at most two goods and two bads", () => {
  const b = buildRecapBullets(
    {
      ...base,
      epaPerPlay: { offense: 0.3, defense: -0.3 },
      turnoverMargin: 2,
      thirdDown: { offense: { att: 12, conv: 9 }, defense: { att: 12, conv: 1 } },
    },
    "MIA"
  );
  assert.equal(b.good.length, 2);
});
