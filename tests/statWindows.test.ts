import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildLastNGameWindows,
  buildLastNWeekWindows,
  filterRowsToWindow,
} from "../scripts/lib/statWindows";
import type { PbpRow } from "../scripts/lib/pbp";

// Minimal fake play-by-play: one row per team per game is enough for
// window construction, which only ever looks at game_id/week/teams.
function play(gameId: string, week: string, posteam: string, defteam: string): PbpRow {
  return { game_id: gameId, week, posteam, defteam } as unknown as PbpRow;
}

// NE plays weeks 1, 2, 4 — week 3 is a bye. Another game exists in week 3
// between two other teams, which is what makes the week-window behaviour
// distinguishable from the game-window behaviour.
const PBP: PbpRow[] = [
  play("2026_01_NE_SEA", "1", "NE", "SEA"),
  play("2026_02_PIT_NE", "2", "NE", "PIT"),
  play("2026_03_BUF_MIA", "3", "BUF", "MIA"),
  play("2026_04_NE_BUF", "4", "NE", "BUF"),
];

describe("buildLastNGameWindows", () => {
  const windows = buildLastNGameWindows(PBP, "NE");

  test("produces one window per game the team has played", () => {
    assert.equal(windows.length, 3);
    assert.deepEqual(windows.map((w) => w.key), ["last-1", "last-2", "last-3"]);
  });

  test("ignores games the team wasn't involved in", () => {
    for (const w of windows) {
      assert.ok(!w.gameIds.has("2026_03_BUF_MIA"), "bye-week game leaked into a window");
    }
  });

  test("last-1 contains only the most recent game", () => {
    const last1 = windows[0];
    assert.equal(last1.gameIds.size, 1);
    assert.ok(last1.gameIds.has("2026_04_NE_BUF"));
  });

  test("each window is a superset of the one before it", () => {
    for (let i = 1; i < windows.length; i++) {
      for (const id of windows[i - 1].gameIds) {
        assert.ok(windows[i].gameIds.has(id), `window ${i} dropped ${id}`);
      }
    }
  });

  test("labels read naturally in the singular", () => {
    assert.equal(windows[0].label, "Last Game");
    assert.equal(windows[1].label, "Last 2 Games");
  });

  test("a team with no plays gets no windows rather than throwing", () => {
    assert.deepEqual(buildLastNGameWindows(PBP, "ZZZ"), []);
  });
});

describe("buildLastNWeekWindows", () => {
  const windows = buildLastNWeekWindows(PBP);

  test("counts back by calendar week, not by the team's games", () => {
    assert.equal(windows[0].key, "last-1-weeks");
    assert.equal(windows[0].label, "Last Week");
  });

  test("includes every team's games inside the week range", () => {
    // This is the property that makes opponent adjustment valid: an
    // opponent's baseline has to be drawn from the same weeks.
    const lastTwo = windows.find((w) => w.key === "last-2-weeks")!;
    assert.ok(lastTwo.gameIds.has("2026_04_NE_BUF"));
    assert.ok(lastTwo.gameIds.has("2026_03_BUF_MIA"), "other teams' games must be in scope");
  });

  test("a bye shows up as a week window containing no game for that team", () => {
    const lastOne = windows[0];
    assert.ok(lastOne.gameIds.has("2026_04_NE_BUF"));
    assert.equal(lastOne.gameIds.size, 1);
  });

  test("returns nothing when there are no weeks at all", () => {
    assert.deepEqual(buildLastNWeekWindows([]), []);
  });
});

describe("filterRowsToWindow", () => {
  test("keeps only rows whose game is in the window", () => {
    const windows = buildLastNGameWindows(PBP, "NE");
    const filtered = filterRowsToWindow(PBP, windows[0]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].game_id, "2026_04_NE_BUF");
  });
});
