import test from "node:test";
import assert from "node:assert/strict";
import {
  receivingSplit,
  receivingDetailLine,
  receiverIsolatedGrade,
  isFullyCharted,
  type FtnReceivingFlags,
} from "../scripts/lib/receiving";
import { leagueMean, shrink } from "../scripts/lib/shrink";
import { rankGeneric } from "../scripts/lib/rank";

type Row = Record<string, string>;

function target(
  id: number,
  opts: { caught?: boolean; yac?: number } = {}
): Row {
  return {
    game_id: "G1",
    play_id: String(id),
    pass_attempt: "1",
    receiver_id: "R1",
    complete_pass: opts.caught ? "1" : "0",
    yards_after_catch: opts.yac === undefined ? "NA" : String(opts.yac),
  };
}

function flags(
  entries: Array<[number, Partial<FtnReceivingFlags>]>
): Map<string, FtnReceivingFlags> {
  return new Map(
    entries.map(([id, f]) => [
      `G1|${id}`,
      { catchable: false, drop: false, contested: false, created: false, ...f },
    ])
  );
}

test("uncatchable targets stay out of the catch-rate denominator", () => {
  // The core claim of the whole feature: a receiver isn't charged for a
  // ball he had no chance at. 4 targets, 2 catchable, both caught.
  const rows = [
    target(1, { caught: true, yac: 5 }),
    target(2, { caught: true, yac: 3 }),
    target(3), // overthrown
    target(4), // behind him
  ];
  const s = receivingSplit(
    rows,
    flags([
      [1, { catchable: true }],
      [2, { catchable: true }],
      [3, {}],
      [4, {}],
    ])
  );
  assert.equal(s.targets, 4);
  assert.equal(s.receptions, 2);
  assert.equal(s.catchableTargets, 2);
  assert.equal(s.catchRateOnCatchable, 1, "2 of 2 catchable caught");
  // The naive rate would be 2/4 = 50%, which is the QB's problem, not his.
  assert.notEqual(s.catchRateOnCatchable, 0.5);
});

test("a drop counts against catch rate because the ball was catchable", () => {
  const rows = [target(1, { caught: true, yac: 0 }), target(2)];
  const s = receivingSplit(
    rows,
    flags([
      [1, { catchable: true }],
      [2, { catchable: true, drop: true }],
    ])
  );
  assert.equal(s.drops, 1);
  assert.equal(s.catchableTargets, 2);
  assert.equal(s.catchRateOnCatchable, 0.5);
  assert.deepEqual(s.catchableOutcomes.slice().sort(), [0, 1]);
});

test("targets with no charting row are excluded, and tracked as coverage", () => {
  const rows = [target(1, { caught: true, yac: 2 }), target(2, { caught: true, yac: 4 })];
  const s = receivingSplit(rows, flags([[1, { catchable: true }]]));
  assert.equal(s.targets, 2);
  assert.equal(s.chartedTargets, 1, "only one target matched a charting row");
  assert.equal(s.catchableTargets, 1);
  assert.equal(isFullyCharted(s), false, "50% coverage is not fully charted");
  // YAC comes from play-by-play, not charting, so both receptions count.
  assert.equal(s.yacPerReception, 3);
});

test("YAC is per reception and ignores incompletions", () => {
  const rows = [
    target(1, { caught: true, yac: 10 }),
    target(2, { caught: true, yac: 0 }),
    target(3),
  ];
  const s = receivingSplit(rows, flags([]));
  assert.equal(s.yacPerReception, 5);
  assert.deepEqual(s.yacValues, [10, 0]);
});

test("empty input is safe and reports nulls rather than zeros", () => {
  const s = receivingSplit([], flags([]));
  assert.equal(s.catchRateOnCatchable, null, "no catchable balls is not a 0% catch rate");
  assert.equal(s.yacPerReception, null);
  assert.equal(receivingDetailLine(s), "");
});

test("detail line reports counts, not a rate that overstates precision", () => {
  const rows = [
    target(1, { caught: true, yac: 4 }),
    target(2, { caught: true, yac: 2 }),
    target(3),
  ];
  const s = receivingSplit(
    rows,
    flags([
      [1, { catchable: true }],
      [2, { catchable: true, contested: true }],
      [3, { catchable: true, drop: true }],
    ])
  );
  const line = receivingDetailLine(s);
  assert.match(line, /2 of 3 catchable balls caught/);
  assert.match(line, /1 drop\b/, "singular, and not '1 drops'");
  assert.match(line, /3\.0 YAC\/rec/);
  assert.match(line, /1\/1 contested/);
  assert.doesNotMatch(line, /%/, "a percentage off 3 attempts implies precision we don't have");
});

// --- the gate itself -------------------------------------------------

const helpers = {
  leagueMean,
  shrink,
  rank: (teams: string[], team: string, valueOf: (t: string) => number, hib: boolean) =>
    rankGeneric(teams, team, valueOf, hib).leaguePercentile,
};

// Builds a league where every team has the same true catch rate, so any
// ordering is noise — the situation that shipped a bogus "3rd in the
// league" before the gate existed.
function noiseLeague(teams: string[], perTeam: number) {
  let s = 7;
  return new Map(
    teams.map((t) => {
      const rows: Row[] = [];
      const f: Array<[number, Partial<FtnReceivingFlags>]> = [];
      for (let i = 0; i < perTeam; i++) {
        s = (s * 1103515245 + 12345) % 2147483648;
        const caught = s / 2147483648 < 0.9;
        rows.push(target(i, { caught, yac: caught ? 4 : undefined }));
        f.push([i, { catchable: true, drop: !caught }]);
      }
      return [t, receivingSplit(rows, flags(f))];
    })
  );
}

const TEAMS = Array.from({ length: 32 }, (_, i) => `T${i}`);

test("no league rank is published when teams differ only by chance", () => {
  const splits = noiseLeague(TEAMS, 24);
  const r = receiverIsolatedGrade(splits, TEAMS, "T0", 40, helpers);
  assert.equal(r.grade, null, "a rank here would be pure noise");
  assert.deepEqual(r.ranked, []);
  assert.ok(r.diagnostics.length > 0, "diagnostics explain the refusal");
  assert.ok(r.diagnostics.every((d) => d.reliability < 0.5));
});

test("a team whose games aren't fully charted gets no grade", () => {
  const splits = noiseLeague(TEAMS, 24);
  // Halve T0's charting coverage while leaving its targets intact.
  const base = splits.get("T0")!;
  splits.set("T0", { ...base, chartedTargets: Math.floor(base.targets / 2) });
  const r = receiverIsolatedGrade(splits, TEAMS, "T0", 40, helpers);
  assert.equal(r.grade, null);
});

test("a real, well-sampled spread does produce a grade", () => {
  // True catch rate climbing across the league, with enough volume that
  // the spread clears chance.
  const splits = new Map(
    TEAMS.map((t, ti) => {
      const rows: Row[] = [];
      const f: Array<[number, Partial<FtnReceivingFlags>]> = [];
      const n = 300;
      const rate = 0.7 + (ti / 31) * 0.25;
      for (let i = 0; i < n; i++) {
        const caught = i < Math.round(n * rate);
        rows.push(target(i, { caught, yac: caught ? 3 + (ti % 5) : undefined }));
        f.push([i, { catchable: true, drop: !caught }]);
      }
      return [t, receivingSplit(rows, flags(f))];
    })
  );
  const best = receiverIsolatedGrade(splits, TEAMS, "T31", 40, helpers);
  const worst = receiverIsolatedGrade(splits, TEAMS, "T0", 40, helpers);
  assert.notEqual(best.grade, null, "this spread is real and should be rankable");
  assert.notEqual(worst.grade, null);
  assert.ok(
    best.grade! > worst.grade!,
    `best team should outrank worst, got ${best.grade} vs ${worst.grade}`
  );
});
