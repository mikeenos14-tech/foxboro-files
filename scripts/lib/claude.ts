// Thin wrapper around Anthropic's Messages API for the small set of
// AI-written content on the site (recap take, next-game preview take,
// good/bad/ugly bullets, beat-writer digest). Everything else on the site
// is computed directly from real data — these are the only places actual
// prose gets generated, and every prompt is built to only use real facts
// passed in, explicitly instructed never to invent stats, plays, or
// events. Every caller must fall back to its existing non-AI content
// (or omit the field) on any failure here, exactly like every other
// external source on this site — a missing key or a network hiccup
// should never break the build.

import type { AiOutcome } from "./aiDiagnostics";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

export async function generateText(
  system: string,
  user: string,
  maxTokens = 400
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — skipping AI content generation.");
    return null;
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      console.error(`Claude API error ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch (err) {
    console.error("Claude API call failed:", err);
    return null;
  }
}

// Generates, runs the deterministic checks in aiChecks.ts, and retries
// once with the specific problems spelled out. `result` is null if the
// second draft still fails, or if no usable response came back at all
// (no key, API error, or JSON cut off / unparseable) — callers then
// publish nothing rather than text that's known to be wrong. `outcome`
// says which, for aiDiagnostics.ts.
export async function generateChecked<T>(
  generate: (user: string) => Promise<T | null>,
  user: string,
  toText: (result: T) => string,
  check: (text: string) => string[],
  label: string
): Promise<{ result: T | null; outcome: AiOutcome }> {
  let prompt = user;
  const problems: string[][] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await generate(prompt);
    if (!result) return { result: null, outcome: { status: "no-response", problems } };
    const found = check(toText(result));
    if (found.length === 0) return { result, outcome: { status: "written", problems } };
    problems.push(found);
    console.warn(`${label}: draft ${attempt} rejected — ${found.join(" ")}`);
    prompt = `${user}\n\nYour previous draft was rejected for these reasons. Fix every one and use only the facts above:\n${found.map((p) => `- ${p}`).join("\n")}`;
  }
  console.warn(`${label}: still failing checks after a retry — nothing written.`);
  return { result: null, outcome: { status: "rejected", problems } };
}

// For prompts that ask the model to respond with only JSON matching a
// known shape. Strips a markdown code fence if the model wraps its
// answer in one despite instructions not to, and returns null (never
// throws) on any parse failure so callers can fall back cleanly.
export async function generateJson<T>(
  system: string,
  user: string,
  maxTokens = 500
): Promise<T | null> {
  const raw = await generateText(system, user, maxTokens);
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("Failed to parse JSON from Claude response:", err, "\nRaw:", raw);
    return null;
  }
}
