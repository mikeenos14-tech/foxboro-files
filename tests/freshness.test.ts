import test from "node:test";
import assert from "node:assert/strict";
import { inSeason, staleSources } from "../scripts/check-freshness";

const now = new Date("2026-09-28T20:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

test("age limits apply September through mid-February only", () => {
  assert.equal(inSeason(new Date("2026-09-10T00:00:00Z")), true);
  assert.equal(inSeason(new Date("2027-01-20T00:00:00Z")), true);
  assert.equal(inSeason(new Date("2027-02-14T00:00:00Z")), true);
  assert.equal(inSeason(new Date("2027-03-01T00:00:00Z")), false);
  assert.equal(inSeason(new Date("2027-07-01T00:00:00Z")), false);
});

test("a source is stale past its job's limit, with the reason", () => {
  const problems = staleSources(
    { headlines: { "web:espn-news.json": { lastAttempt: hoursAgo(1), lastSuccess: hoursAgo(13), lastError: "HTTP 503" } } },
    now
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /web:espn-news\.json: last fetched 13 hours ago — latest error: HTTP 503/);
});

test("one failed attempt after a recent success is fine", () => {
  assert.deepEqual(
    staleSources({ stats: { "nflverse:games.csv": { lastAttempt: hoursAgo(0), lastSuccess: hoursAgo(20), lastError: "timeout" } } }, now),
    []
  );
});

test("fresh if any job that fetches it succeeded within that job's limit", () => {
  const status = {
    headlines: { "web:espn-news.json": { lastAttempt: hoursAgo(1), lastSuccess: hoursAgo(20) } },
    stats: { "web:espn-news.json": { lastAttempt: hoursAgo(2), lastSuccess: hoursAgo(2) } },
  };
  assert.deepEqual(staleSources(status, now), []);
});

test("a source that never succeeded says so", () => {
  const problems = staleSources({ stats: { "web:espn-standings.json": { lastAttempt: hoursAgo(1), lastError: "404" } } }, now);
  assert.match(problems[0], /last fetched never/);
});
