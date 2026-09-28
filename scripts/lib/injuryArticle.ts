// Parses patriots.com's weekly injury-report article body in code.
//
// This used to be an AI extraction. Checked against the real Week 3
// report, it had returned 4 of 16 players: every Patriot in the "NO GAME
// STATUS GIVEN" list and every Jaguar — including one listed Doubtful —
// were missing, and positions were rewritten (LB → OLB). Its prompt also
// said the most recent day "appears last", when the article lists the
// newest day first. The article is a fixed template, so code reads it
// exactly, and returns null when the template isn't recognized rather
// than guessing — the site then falls back to the official nflverse /
// ESPN data.
//
// The template (checked against the Week 1-3 2026 reports, kept in
// tests/fixtures/):
//   <DAY>, <MONTH> <D>, <YYYY>        one section per report day, newest first
//   <CITY> <NICKNAME>                 one block per team, in capitals
//   DID NOT PARTICIPATE / LIMITED PARTICIPATION / FULL PARTICIPATION
//   OUT / DOUBTFUL / QUESTIONABLE     (final report: game designations)
//   POS Name - Injury (DNP|LP|FP)     one player per line
//   NO GAME STATUS GIVEN: POS Name - Injury (FP), POS Name - ...   (one line)
// Section and team headers are often glued to the previous line's text
// ("...- AnklePITTSBURGH STEELERS"), so they're found by pattern, not by
// line breaks.

import { TEAM_NICKNAMES } from "./teams";
import type { InjuryReportEntry } from "../../lib/data/types";

type PracticeStatus = NonNullable<InjuryReportEntry["practiceStatus"]>;
type GameStatus = "Out" | "Doubtful" | "Questionable";

export interface ParsedInjury {
  team: string;
  position: string;
  playerName: string;
  injury: string;
  practiceStatus?: PracticeStatus;
  gameStatus?: GameStatus;
}

export interface ParsedReport {
  /** The report day used — always the latest date in the article. */
  day: string;
  players: ParsedInjury[];
  /** Players listed twice with different statuses; left out rather than guessed. */
  conflicts: string[];
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];
const DAY_HEADER = new RegExp(
  `(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),\\s+(${MONTHS.join("|")})\\s+(\\d{1,2}),\\s+(\\d{4})`,
  "g"
);

const PRACTICE_HEADINGS: Record<string, PracticeStatus> = {
  "DID NOT PARTICIPATE": "Did Not Participate",
  "LIMITED PARTICIPATION": "Limited",
  "LIMITED AVAILABILITY": "Limited",
  "FULL PARTICIPATION": "Full",
  "FULL AVAILABILITY": "Full",
};
const GAME_HEADINGS: Record<string, GameStatus> = {
  OUT: "Out",
  DOUBTFUL: "Doubtful",
  QUESTIONABLE: "Questionable",
};
const CODES: Record<string, PracticeStatus> = {
  DNP: "Did Not Participate",
  LP: "Limited",
  FP: "Full",
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "POS Name - Injury (LP)" → fields. The practice code's closing
// parenthesis is sometimes missing in the source ("Knee (FP, CB ...").
function parsePlayerChunk(raw: string): Omit<ParsedInjury, "team" | "gameStatus"> | null {
  let text = raw.trim().replace(/\.$/, "");
  let practiceStatus: PracticeStatus | undefined;
  const code = text.match(/\s*\((DNP|LP|FP)\)?/);
  if (code) {
    practiceStatus = CODES[code[1]];
    text = (text.slice(0, code.index) + text.slice(code.index! + code[0].length)).trim();
  }
  const [head, ...rest] = text.split(/\s+-\s+/);
  const m = head.match(/^([A-Z]{1,4})\s+(\S.*)$/);
  if (!m || !/^[A-Z]/.test(m[2])) return null;
  return {
    position: m[1],
    playerName: m[2].trim(),
    injury: rest.join(" - ").replace(/,\s*$/, "").trim() || "Not specified",
    practiceStatus,
  };
}

function parseTeamBlock(team: string, block: string): ParsedInjury[] {
  const out: ParsedInjury[] = [];
  let practiceHeading: PracticeStatus | undefined;
  let gameHeading: GameStatus | undefined;
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line || /^no players listed\.?$/i.test(line)) continue;
    if (PRACTICE_HEADINGS[line]) {
      practiceHeading = PRACTICE_HEADINGS[line];
      gameHeading = undefined;
      continue;
    }
    if (GAME_HEADINGS[line]) {
      gameHeading = GAME_HEADINGS[line];
      practiceHeading = undefined;
      continue;
    }
    const noStatus = line.match(/^NO GAME STATUS GIVEN:\s*(.*)$/i);
    if (noStatus) {
      // One run-on line; split before each "POS Name" that starts a player.
      // Usually comma-separated; once a period ("(FP). DT Cameron
      // Heyward"). A period only splits before a position code and a
      // lowercase-continuing name, so initials ("TE A.J. Barner") and
      // suffixes ("Jr.") never split mid-player.
      for (const chunk of noStatus[1].split(/,\s+(?=[A-Z]{1,4}\s+[A-Z])|\.\s+(?=[A-Z]{1,4}\s+[A-Z][a-z])/)) {
        const p = parsePlayerChunk(chunk);
        if (p) out.push({ team, ...p });
      }
      continue;
    }
    const p = parsePlayerChunk(line);
    if (!p) continue;
    out.push({
      team,
      ...p,
      practiceStatus: p.practiceStatus ?? practiceHeading,
      ...(gameHeading ? { gameStatus: gameHeading } : {}),
    });
  }
  return out;
}

/** Null when the article doesn't match the template — callers then skip it. */
export function parseInjuryArticle(body: string, teams: string[]): ParsedReport | null {
  const text = body.split(/Bold indicates a change/i)[0];

  const days = [...text.matchAll(DAY_HEADER)].map((m) => ({
    label: m[0],
    start: m.index!,
    end: m.index! + m[0].length,
    date: Date.UTC(Number(m[4]), MONTHS.indexOf(m[2]), Number(m[3])),
  }));
  if (days.length === 0) return null;
  // Newest by date, not by position — the article lists newest first.
  const latestIndex = days.reduce((best, d, i) => (d.date > days[best].date ? i : best), 0);
  const latest = days[latestIndex];
  const nextStart = days.filter((d) => d.start > latest.start).map((d) => d.start)[0] ?? text.length;
  const section = text.slice(latest.end, nextStart);

  const nicknames = teams.map((t) => TEAM_NICKNAMES[t]?.toUpperCase()).filter((n): n is string => !!n);
  const header = new RegExp(`(?:[A-Z][A-Z.']*\\s+){1,3}(${nicknames.map(escape).join("|")})(?![A-Za-z])`, "g");
  const headers = [...section.matchAll(header)].map((m) => ({
    team: teams.find((t) => TEAM_NICKNAMES[t]?.toUpperCase() === m[1])!,
    start: m.index!,
    end: m.index! + m[0].length,
  }));
  if (headers.length === 0) return null;

  const all: ParsedInjury[] = [];
  headers.forEach((h, i) => {
    const block = section.slice(h.end, headers[i + 1]?.start ?? section.length);
    all.push(...parseTeamBlock(h.team, block));
  });

  // The same player twice with different statuses is a source error
  // (Week 3 listed one Jaguar as both FP and DNP). Leave them out.
  const key = (p: ParsedInjury) => `${p.team}|${p.playerName}`;
  const conflicts = new Set<string>();
  const seen = new Map<string, ParsedInjury>();
  for (const p of all) {
    const prev = seen.get(key(p));
    if (prev && (prev.practiceStatus !== p.practiceStatus || prev.gameStatus !== p.gameStatus)) {
      conflicts.add(key(p));
    }
    seen.set(key(p), p);
  }
  return {
    day: latest.label,
    players: [...seen.values()].filter((p) => !conflicts.has(key(p))),
    conflicts: [...conflicts].map((k) => k.split("|")[1]),
  };
}
