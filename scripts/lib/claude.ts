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
