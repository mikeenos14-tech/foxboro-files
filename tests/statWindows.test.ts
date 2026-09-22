import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildLastNGameWindows,
  buildLastNWeekWindows,
  gameWindowForSize,
  filterRowsToWindow,
  RECENT_WINDOW_SIZES,
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

  test("offers only the fixed recent-form windows, never one per game", () => {
    // 3 games played, so last-1 qualifies and last-3 does not (it would
    // just be the full season under a second name). The old behaviour
    // produced one window per game, which meant 17 dropdown entries by
    // the end of a season.
    assert.deepEqual(windows.map((w) => w.key), ["last-1"]);
  });

  test("a longer season unlocks the bigger windows, and stops there", () => {
    const long: PbpRow[] = Array.from({ length: 8 }, (_, i) =>
      play(`2026_${String(i + 1).padStart(2, "0")}_NE_BUF`, String(i + 1), "NE", "BUF")
    );
    const w = buildLastNGameWindows(long, "NE");
    assert.deepEqual(w.map((x) => x.key), ["last-1", "last-3", "last-5"]);
    assert.equal(w.length, RECENT_WINDOW_SIZES.length, "the set never grows past the fixed sizes");
  });

  test("a window equal to the games played is not offered twice", () => {
    // Exactly 3 games: "Last 3 Games" and the season are the same number.
    const three: PbpRow[] = Array.from({ length: 3 }, (_, i) =>
      play(`2026_0${i + 1}_NE_BUF`, String(i + 1), "NE", "BUF")
    );
    assert.deepEqual(buildLastNGameWindows(three, "NE").map((x) => x.key), ["last-1"]);
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
    const long: PbpRow[] = Array.from({ length: 8 }, (_, i) =>
      play(`2026_${String(i + 1).padStart(2, "0")}_NE_BUF`, String(i + 1), "NE", "BUF")
    );
    assert.equal(buildLastNGameWindows(long, "NE")[1].label, "Last 3 Games");
  });

  test("a team with no plays gets no windows rather than throwing", () => {
    assert.deepEqual(buildLastNGameWindows(PBP, "ZZZ"), []);
  });
});

describe("gameWindowForSize", () => {
  test("clamps to the games a team has actually played", () => {
    // NE has 3 games; asking for a 5-game window gives all 3 rather
    // than nothing. This is how league baselines stay comparable once
    // byes make game counts differ.
    const w = gameWindowForSize(PBP, "NE", 5)!;
    assert.equal(w.games, 3);
    assert.equal(w.gameIds.size, 3);
    assert.equal(w.key, "last-5", "keyed by the size requested, not the size delivered");
  });

  test("resolves by size so two teams' windows mean the same thing", () => {
    // The bug this guards: looking a window up by its POSITION in each
    // team's list compared our last five against someone else's last
    // three, because the offered list depends on games played.
    const ne = gameWindowForSize(PBP, "NE", 1)!;
    const buf = gameWindowForSize(PBP, "BUF", 1)!;
    assert.equal(ne.games, 1);
    assert.equal(buf.games, 1);
  });

  test("a team with no games returns null rather than an empty window", () => {
    assert.equal(gameWindowForSize(PBP, "ZZZ", 3), null);
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
    // 4 weeks played, so last-3-weeks is offered and reaches back to
    // week 2, covering the week-3 game NE wasn't part of.
    const lastThree = windows.find((w) => w.key === "last-3-weeks")!;
    assert.ok(lastThree.gameIds.has("2026_04_NE_BUF"));
    assert.ok(lastThree.gameIds.has("2026_03_BUF_MIA"), "other teams' games must be in scope");
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
