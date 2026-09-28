// Deterministic checks on AI-written prose, run before anything is saved.
//
// A prompt rule is not enforcement. Every check here exists because the
// model broke the matching rule in text that shipped, despite being told
// not to:
//   - "The Jaguars came to Foxboro" — for a game played in Jacksonville.
//   - "Remy Stevenson" — handed "R.Stevenson", it invented a first name.
//   - "the second-year quarterback" — Drake Maye was in his third season.
//   - "600 wins deep in franchise history" — no such fact was given.
//   - "Buffalo's run defense is historically bad" — off three games.
//   - "sometimes ugly wins are exactly what you need in October" — for a
//     September 20 game.
//   - "The articles mention two straight games with…" — prompt leaking.
//
// Each check is narrow and mechanical on purpose. A general "is every
// claim in the facts?" scanner would flag the legitimate context the
// writer is allowed to add and block more good text than bad; these only
// catch specific, repeatable failure shapes.

export interface GroundingContext {
  /** Everything the model was given, verbatim — the prompt's user message. */
  facts: string;
  /** For game content: was New England at home? Omit when not about one game. */
  isHome?: boolean;
  /** Full player names the model was given, e.g. "Rhamondre Stevenson". */
  playerNames?: string[];
  /** Kickoff, Eastern, "HH:MM" — time-of-day words must agree with it. */
  kickoffEt?: string;
}

// Time-of-day words and the kickoff hours (Eastern) they fit. A Wednesday
// 8:20pm opener was written up as a loss "all afternoon".
const TIME_OF_DAY: Array<[RegExp, (hour: number) => boolean]> = [
  [/\bmorning\b/i, (h) => h < 12],
  [/\bafternoon\b/i, (h) => h >= 12 && h < 17],
  [/\b(evening|tonight|night|prime[- ]?time|under the lights)\b/i, (h) => h >= 17],
];

const HOME_PLACES = /\b(Foxboro|Foxborough|Gillette)\b/i;
const TENURE = /\b(rookie|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th))-year\b/gi;
const FRANCHISE_HISTORY = /\b(franchise history|team history|all-time|in franchise|historic|historically|record-setting)\b/i;
const YEAR = /\b(?:19|20)\d{2}\b/g;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_WORD = new RegExp(`\\b(${MONTHS.join("|")})\\b`, "g");
// Talking about the prompt instead of the game ("The articles mention…").
const PROMPT_LEAK = /\b(the articles|articles (mention|say|note)|the facts (given|above|provided)|facts provided)\b/i;
// Play-by-play's own name format ("R.Stevenson", "D. Maye"). Not
// preceded by another initial, so "A.J. Brown" isn't read as "J. Brown" —
// that false positive blocked a correct Week 1 recap twice.
const ABBREVIATED_NAME = /(?<![A-Z]\.)\b[A-Z]\.\s?[A-Z][a-z]+/;
// Capitalized words that can sit in front of a surname without being a
// first name ("When Stevenson…", "RB Stevenson").
const NOT_FIRST_NAMES = new Set([
  "A", "An", "And", "As", "At", "But", "By", "For", "From", "If", "In", "It", "Of", "On",
  "Once", "Or", "So", "That", "The", "Then", "This", "To", "When", "While", "With", "Without",
  "Yet", "Patriots", "Pats", "New", "England",
]);

export function checkGrounding(text: string, ctx: GroundingContext): string[] {
  const problems: string[] = [];
  const factsLower = ctx.facts.toLowerCase();

  if (ctx.isHome === false && HOME_PLACES.test(text) && !HOME_PLACES.test(ctx.facts)) {
    problems.push("It places the game in Foxborough, but New England was the road team.");
  }

  for (const match of text.matchAll(TENURE)) {
    if (!factsLower.includes(match[0].toLowerCase())) {
      problems.push(`It says "${match[0]}", which isn't in the facts given.`);
    }
  }

  if (FRANCHISE_HISTORY.test(text) && !FRANCHISE_HISTORY.test(ctx.facts)) {
    problems.push("It makes a franchise-history claim that isn't in the facts given.");
  }

  for (const match of text.matchAll(YEAR)) {
    if (!ctx.facts.includes(match[0])) {
      problems.push(`It mentions the year ${match[0]}, which isn't in the facts given.`);
    }
  }

  // A month is fine if the facts name it or contain an ISO date in it —
  // a Sept. 20 game was described as an "October" win.
  const allowedMonths = new Set<string>();
  for (const m of ctx.facts.matchAll(/\b\d{4}-(\d{2})-\d{2}\b/g)) allowedMonths.add(MONTHS[Number(m[1]) - 1]);
  for (const m of ctx.facts.matchAll(MONTH_WORD)) allowedMonths.add(m[1]);
  for (const m of text.matchAll(MONTH_WORD)) {
    if (!allowedMonths.has(m[1])) problems.push(`It mentions ${m[1]}, which doesn't match any date given.`);
  }

  if (PROMPT_LEAK.test(text)) {
    problems.push("It refers to the articles or facts it was given — write about the game, not the source material.");
  }

  const kickoffHour = ctx.kickoffEt ? Number(ctx.kickoffEt.split(":")[0]) : null;
  for (const [pattern, fits] of TIME_OF_DAY) {
    const m = text.match(pattern);
    if (!m || pattern.test(ctx.facts.replace(/Kickoff:[^\n]*/g, ""))) continue;
    if (kickoffHour === null || !fits(kickoffHour)) {
      problems.push(`It says "${m[0]}", which doesn't fit the kickoff time given.`);
    }
  }

  // Names given in full are never abbreviations, whatever initials they use.
  let unnamed = text;
  for (const full of ctx.playerNames ?? []) unnamed = unnamed.split(full).join("");
  const abbreviated = unnamed.match(ABBREVIATED_NAME);
  if (abbreviated) {
    problems.push(`It uses an abbreviated name ("${abbreviated[0]}") — use the full name given.`);
  }

  for (const full of ctx.playerNames ?? []) {
    const parts = full.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const first = parts[0];
    const surname = parts.slice(1).join(" ");
    const escaped = surname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const m of text.matchAll(new RegExp(`\\b([A-Z][a-z]+)\\s+${escaped}\\b`, "g"))) {
      if (m[1] !== first && !NOT_FIRST_NAMES.has(m[1])) {
        problems.push(`It calls ${full} "${m[1]} ${surname}".`);
      }
    }
  }

  return [...new Set(problems)];
}
