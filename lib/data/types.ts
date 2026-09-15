// Core data types for Foxboro Files.
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
  starOfTheGame: { playerId: string; playerName: string; wpa: number };
  goodBadUgly: { good: string[]; bad: string[]; ugly: string[] };
  playerOfTheGame: { playerId: string; playerName: string; reason: string };
}

export interface TeamStatSnapshot {
  team: string;
  season: number;
  epaPerPlay: { offense: RankedStat; defense: RankedStat };
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
}

export interface PositionGroupReportCard {
  group: string;
  grade: number; // 0-100 internal grade
  leagueAvg: number;
  trend: "up" | "down" | "flat";
  soWhat: string;
}

export interface QBDeepDive {
  playerId: string;
  playerName: string;
  espnId?: string;
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

export type PracticeStatus = "DNP" | "Limited" | "Full";
export type GameStatus = "Out" | "Doubtful" | "Questionable" | "Probable";

export interface InjuryReportEntry {
  playerId: string;
  playerName: string;
  position: string;
  week: number;
  injury: string;
  wednesday?: PracticeStatus;
  thursday?: PracticeStatus;
  friday?: PracticeStatus;
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
}

export interface DepthChartEntry {
  position: string;
  players: Array<{ playerId: string; playerName: string; rank: number; espnId?: string }>;
}
