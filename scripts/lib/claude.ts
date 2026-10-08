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

// Why the most recent call returned nothing, in words the health check
// can put in an email. An expired key looks exactly like any other
// failure to the callers (they publish nothing and carry on), so without
// this the only symptom was recaps quietly missing their Take.
let lastFailure: string | undefined;
export function lastAiFailure(): string | undefined {
  return lastFailure;
}
function describeFailure(status: number): string {
  if (status === 401) return "API key rejected (HTTP 401) — it may have expired or been deleted";
  if (status === 403) return "API key not allowed to use this model (HTTP 403)";
  if (status === 429) return "rate-limited or out of credit (HTTP 429)";
  if (status === 529 || status >= 500) return `Anthropic's API was down or overloaded (HTTP ${status})`;
  return `API error (HTTP ${status})`;
}
const MODEL = "claude-haiku-4-5-20251001";

export async function generateText(
  system: string,
  user: string,
  maxTokens = 400
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  lastFailure = undefined;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — skipping AI content generation.");
    lastFailure = "no ANTHROPIC_API_KEY is set";
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
      lastFailure = describeFailure(res.status);
      return null;
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch (err) {
    console.error("Claude API call failed:", err);
    lastFailure = `couldn't reach Anthropic's API (${String(err).slice(0, 80)})`;
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
    if (!result) {
      return { result: null, outcome: { status: "no-response", problems, error: lastFailure ?? "the reply couldn't be read (cut off or not JSON)" } };
    }
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
