// Core data types for The Foxboro Beacon.
// Phase 0: populated from hand-written fixtures (lib/data/fixtures.ts).
// Phase 1+: populated by scripts/build-data.ts from nflverse + ESPN, same shapes.

export interface Team {
  id: string; // nflverse-style abbreviation, e.g. "NE"
  espnId: string;
  name: string;
  abbreviation: string;
  conference: "AFC" | "NFC";
  division: string;
}

export interface DivisionStanding {
  team: string;
  wins: number;
  losses: number;
  ties: number;
  pointDifferential: number;
  isUs: boolean;
  streak: { result: "W" | "L" | "T"; count: number } | null;
  divisionRecord: { wins: number; losses: number; ties: number };
}

export interface LeagueDivisionGroup {
  division: string;
  standings: DivisionStanding[];
}

export interface LeagueEpaRanking {
  team: string;
  offenseEpa: number;
  offenseRank: number;
  defenseEpa: number;
  defenseRank: number;
}

export interface LeagueScoreboardGame {
  gameId: string;
  week: number;
  date: string;
  weekday: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  // Season record after this game (current standings — this is the most
  // recently completed week league-wide, so it reflects the result shown).
  homeRecord: string;
  awayRecord: string;
  overtime: boolean;
}

export interface Player {
  id: string; // nflverse gsis_id
  espnId?: string;
  headshotUrl?: string;
  name: string;
  position: string;
  team: string;
  jerseyNumber?: number;
  status?: "Active" | "IR" | "PUP" | "Suspended";
}

export interface Game {
  id: string;
  season: number;
  week: number;
  seasonType: "REG" | "POST" | "PRE";
  date: string; // ISO date
  kickoffTimeEt?: string; // "13:00", Eastern Time, from nflverse's schedule
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "final" | "postponed";
  venue: string;
  network?: string;
}

export interface RankedStat {
  value: number;
  leagueRank: number; // 1-32, 1 = best
  leaguePercentile: number; // 0-100
}

export interface GameRecap {
  gameId: string;
  narrative: string;
  fanTake?: string;
  epaPerPlay: { offense: number; defense: number };
  successRate: {
    offenseByDown: Record<1 | 2 | 3 | 4, number>;
    defenseByDown: Record<1 | 2 | 3 | 4, number>;
  };
  turnoverMargin: number;
  pointsOffTurnovers: { for: number; against: number };
  explosivePlayRate: { for: number; against: number };
  redZone: {
    offense: { att: number; td: number };
    defense: { att: number; td: number };
  };
  thirdDown: {
    offense: { att: number; conv: number };
    defense: { att: number; conv: number };
  };
  winProbabilityTimeline: Array<{
    playIndex: number;
    quarter: number;
    clock: string;
    homeWinProb: number;
  }>;
  goodBadUgly: { good: string[]; bad: string[]; ugly: string[] };
  playerOfTheGame: {
    playerId: string;
    playerName: string;
    wpa: number;
    reason: string;
    headshotUrl?: string;
  };
}

export interface TeamStatSnapshot {
  team: string;
  season: number;
  epaPerPlay: { offense: RankedStat; defense: RankedStat };
  // Same opponent-adjusted EPA/play as epaPerPlay above, recomputed for
  // each "last N weeks" window so Team Strength can show recent form, not
  // just the full-season snapshot. Real opponent-adjustment throughout
  // (see statWindows.ts's buildLastNWeekWindows for why calendar weeks,
  // not per-team game counts, keep that adjustment sound).
  epaPerPlayWindows: Array<{ key: string; label: string; offense: RankedStat; defense: RankedStat }>;
  successRate: { offense: RankedStat; defense: RankedStat };
  explosivePlayRate: { offense: RankedStat; defense: RankedStat };
  pointDifferential: RankedStat;
  pythagoreanWinPct: number;
  redZonePct: { offense: RankedStat; defense: RankedStat };
  thirdDownPct: { offense: RankedStat; defense: RankedStat };
  twoMinuteDrillEpa: { offense: RankedStat; defense: RankedStat };
  splits: {
    home: { wins: number; losses: number; epaPerPlay: number };
    away: { wins: number; losses: number; epaPerPlay: number };
    divisional: { wins: number; losses: number };
  };
  specialTeams: {
    fieldGoalPct: RankedStat;
    netPuntingAvg: RankedStat;
    kickReturnAvg: RankedStat;
    puntReturnAvg: RankedStat;
    specialTeamsEpa: RankedStat;
  };
  // Real penalty counts/yards — a traditional stat with no presence on
  // the site before this (EPA reflects a penalty's down/distance swing
  // but doesn't isolate "how disciplined is this team" as its own real
  // number). Lower rank number is better (fewer penalties = good), same
  // convention RankedStat always uses via leagueRank.
  discipline: {
    penaltiesCommitted: RankedStat;
    penaltyYardsCommitted: RankedStat;
    mostPenalized?: { playerName: string; count: number };
  };
}

export interface PositionGroupReportCard {
  group: string;
  grade: number; // 0-100 internal grade — a league percentile (50 = average)
  trend: "up" | "down" | "flat";
  soWhat: string;
  // Same grade recomputed over just the team's own last N games, for
  // every N from 1 up to games played — lets Position Grades show recent
  // form the same way QB Deep Dive does (see QBDeepDive.windows).
  windows: Array<{ key: string; label: string; grade: number }>;
  // A real traditional-counting-stat line, full-season only (not
  // windowed — the numeric grade above already gets that treatment).
  // EPA/proxy-based grades don't change here; this is added texture, not
  // a replacement — e.g. RB: "187 yds, 3.9 YPC, 2 TD, 1 FUM"; Edge:
  // "6.5 sacks, 13 QB hits — leader: G. Jacas (2.5 sacks)". Empty string
  // when there's nothing real to show yet (e.g. LB's placeholder card).
  statLine: string;
}

// Every team's position-group grades, full-season only — powers the
// group-vs-group compare tool (see components/roster/PositionGroupHeadToHead.tsx),
// the same idea as QbHeadToHead but for any position group, not just QB.
export interface PositionGroupLeagueGroupEntry {
  group: string;
  grade: number; // 0-100 league percentile, same convention as PositionGroupReportCard
  rawValue: number;
  // What rawValue actually is — varies by group (EPA/play for the four
  // skill positions, a rate stat for the rest), so each entry carries its
  // own label rather than assuming one shared unit.
  rawLabel: string;
}

export interface PositionGroupLeagueTeamEntry {
  team: string;
  groups: PositionGroupLeagueGroupEntry[];
}

export interface QBWindowStats {
  attempts: number;
  completions: number;
  yards: number;
  tds: number;
  ints: number;
  cpoe: number;
  accuracyByDepth: { short: number; medium: number; deep: number };
  pressureEpa: number;
  cleanPocketEpa: number;
  turnoverWorthyPlayRate: number;
}

export interface QBDeepDive extends QBWindowStats {
  playerId: string;
  playerName: string;
  headshotUrl?: string;
  team: string;
  // Percentile rank among league starting QBs for each advanced stat —
  // only populated on the site's own featured entry (Maye), computed
  // against the full league table; left undefined on the plain per-team
  // rows of that table itself, where "rank vs. what" would be circular.
  ranks?: {
    cpoe: RankedStat;
    turnoverWorthyPlayRate: RankedStat;
    cleanPocketEpa: RankedStat;
    pressureEpa: RankedStat;
  };
  // Same stat bundle recomputed over just the last N games, for every N
  // from 1 up to games played this season — lets the QB Deep Dive page
  // show "how's he looked lately" instead of only the full-season blend.
  // Only populated on the featured entry (Maye), same as ranks above.
  windows?: Array<{ key: string; label: string; stats: QBWindowStats }>;
}

export interface ScheduleRow {
  gameId: string;
  week: number;
  opponent: string;
  homeAway: "home" | "away";
  opponentRecord: string;
  opponentPointDiff: number;
  opponentEpaRank: number;
  strengthOfSchedule: { season: number; opponentSos: number };
  restDays: number;
  opponentRestDays: number;
  isDivisional: boolean;
  isConference: boolean;
  winProbabilityEstimate?: number;
  result?: "W" | "L" | "T";
  ourScore?: number;
  theirScore?: number;
  date: string;
}

export interface SeasonProjection {
  projectedWins: number;
  projectedLosses: number;
  playoffOdds?: number;
}

export type NewsType = "Injury" | "Transaction" | "Analysis" | "Beat Report";

export interface NewsItem {
  id: string;
  publishedAt: string;
  type: NewsType;
  headline: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  embed?: { kind: "video" | "tweet"; url: string };
  relatedPlayerIds?: string[];
}

export type PracticeStatus = "Did Not Participate" | "Limited" | "Full";
export type GameStatus = "Out" | "Doubtful" | "Questionable" | "Probable";

export interface InjuryReportEntry {
  playerId: string;
  playerName: string;
  position: string;
  week: number;
  injury: string;
  // Most-recent practice participation available — real sources (nflverse's
  // official report, ESPN's live status) give one current snapshot, not a
  // Wed/Thu/Fri breakdown, so that's what this reflects.
  practiceStatus?: PracticeStatus;
  gameStatus?: GameStatus | null;
  lastUpdated: string;
}

export interface PositionMatchup {
  group: string;
  ourGrade: number;
  theirGrade: number;
  edge: "us" | "them" | "even";
  note: string;
}

export interface OpponentMatchupData {
  gameId: string;
  opponent: string;
  opponentEpaRank: { offense: number; defense: number };
  positionGroupMatchups: PositionMatchup[];
  matchupOfTheWeek: { title: string; description: string };
  opponentInjuries: InjuryReportEntry[];
  recentForm: {
    last3EpaPerPlay: number;
    last5EpaPerPlay: number;
    seasonEpaPerPlay: number;
  };
  headToHead: Array<{ season: number; result: string; score: string }>;
  weather?: {
    tempF: number;
    wind: string;
    precipitation: string;
    isDome: boolean;
  };
  bettingContext?: { spread: number; overUnder: number; asOf: string };
  previewTake?: string;
}

export interface BeatDigest {
  text: string;
  asOf: string;
}

export interface DepthChartEntry {
  position: string;
  players: Array<{
    playerId: string;
    playerName: string;
    rank: number;
    headshotUrl?: string;
  }>;
}
