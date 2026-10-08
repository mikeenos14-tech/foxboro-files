import { test } from "node:test";
import assert from "node:assert/strict";
import { aiProblems } from "../scripts/lib/aiHealth";

const now = new Date("2026-10-08T18:00:00Z");
const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();

test("all written: nothing to report", () => {
  assert.deepEqual(aiProblems([{ "recap a": { status: "written", problems: [], at: at(2) } }], now), []);
});

test("a rejected key is one clear problem naming everything affected", () => {
  const out = aiProblems(
    [
      { "recap a": { status: "no-response", problems: [], error: "API key rejected (HTTP 401) — it may have expired or been deleted", at: at(3) } },
      { "beat digest": { status: "no-response", problems: [], error: "API key rejected (HTTP 401) — it may have expired or been deleted", at: at(1) } },
    ],
    now
  );
  assert.equal(out.length, 1);
  assert.match(out[0], /HTTP 401/);
  assert.match(out[0], /Replace ANTHROPIC_API_KEY/);
  assert.match(out[0], /recap a, beat digest/);
});

test("other failures and twice-rejected drafts are reported individually", () => {
  const out = aiProblems(
    [
      {
        "preview x": { status: "no-response", problems: [], error: "Anthropic's API was down or overloaded (HTTP 529)", at: at(2) },
        "recap y": { status: "rejected", problems: [["It mentions October."], ["It mentions October."]], at: at(2) },
      },
    ],
    now
  );
  assert.equal(out.length, 2);
  assert.match(out[0], /preview x: Anthropic's API was down/);
  assert.match(out[1], /recap y failed its checks twice.*October/);
});

test("old entries for content no longer retried are ignored", () => {
  assert.deepEqual(aiProblems([{ "preview old": { status: "rejected", problems: [["x"]], at: at(80) } }], now), []);
});
