// Hand-written fixture data for Phase 0 (design/scaffold milestone).
// Shapes match lib/data/types.ts exactly so swapping in scripts/build-data.ts's
// real output in Phase 1 requires no component changes — only store.ts's
// internals change.
//
// Numbers are illustrative, not real 2026 Patriots stats.

import type {
  BeatDigest,
  DepthChartEntry,
  DivisionStanding,
  Game,
  GameRecap,
  InjuryReportEntry,
  LeagueDivisionGroup,
  LeagueEpaRanking,
  LeagueScoreboardGame,
  NewsItem,
  OpponentMatchupData,
  PositionGroupReportCard,
  QBDeepDive,
  ScheduleRow,
  SeasonProjection,
  Team,
  TeamStatSnapshot,
} from "./types";

export const team: Team = {
  id: "NE",
  espnId: "17",
  name: "New England",
  abbreviation: "NE",
  conference: "AFC",
  division: "AFC East",
};

export const lastGame: Game = {
  id: "2026-w02-MIA",
  season: 2026,
  week: 2,
  seasonType: "REG",
  date: "2026-09-13",
  homeTeam: "NE",
  awayTeam: "MIA",
  homeScore: 27,
  awayScore: 17,
  status: "final",
  venue: "Gillette Stadium",
  network: "CBS",
};

export const nextGame: Game = {
  id: "2026_02_PIT_NE",
  season: 2026,
  week: 2,
  seasonType: "REG",
  date: "2026-09-20",
  homeTeam: "NE",
  awayTeam: "PIT",
  status: "scheduled",
  venue: "Gillette Stadium",
  network: "FOX",
};

export const lastGameRecap: GameRecap = {
  gameId: "2026-w02-MIA",
  narrative:
    "New England controlled the trenches from the opening drive, leaning on a run-heavy script that kept Miami's pass rush off balance. A third-quarter pick-six turned a one-score game into a comfortable margin, and the defense closed it out by winning third down all afternoon.",
  fanTake:
    "This is the version of the Patriots we've been waiting for. Physical up front, no wasted possessions, and that pick-six was the dagger we needed after years of watching games like this slip away. Keep building on this.",
  epaPerPlay: { offense: 0.14, defense: -0.09 },
  successRate: {
    offenseByDown: { 1: 0.52, 2: 0.47, 3: 0.44, 4: 0.6 },
    defenseByDown: { 1: 0.41, 2: 0.38, 3: 0.29, 4: 0.5 },
  },
  turnoverMargin: 2,
  pointsOffTurnovers: { for: 10, against: 0 },
  explosivePlayRate: { for: 0.12, against: 0.06 },
  redZone: {
    offense: { att: 4, td: 3 },
    defense: { att: 2, td: 1 },
  },
  thirdDown: {
    offense: { att: 12, conv: 7 },
    defense: { att: 11, conv: 3 },
  },
  winProbabilityTimeline: [
    { playIndex: 0, quarter: 1, clock: "15:00", homeWinProb: 0.5 },
    { playIndex: 20, quarter: 1, clock: "5:00", homeWinProb: 0.58 },
    { playIndex: 40, quarter: 2, clock: "10:00", homeWinProb: 0.55 },
    { playIndex: 60, quarter: 2, clock: "2:00", homeWinProb: 0.62 },
    { playIndex: 80, quarter: 3, clock: "9:00", homeWinProb: 0.7 },
    { playIndex: 90, quarter: 3, clock: "4:30", homeWinProb: 0.88 },
    { playIndex: 110, quarter: 4, clock: "8:00", homeWinProb: 0.93 },
    { playIndex: 130, quarter: 4, clock: "1:00", homeWinProb: 0.99 },
  ],
  goodBadUgly: {
    good: [
      "Offensive line won at the point of attack all day — 5.4 yards per carry before contact adjustments.",
      "Third-down defense held Miami to 27% — season-best.",
    ],
    bad: [
      "Two false-start penalties stalled an early red-zone trip.",
      "Kick coverage unit allowed a 38-yard return that flipped field position once.",
    ],
    ugly: [
      "Starting right tackle left in the second half with an ankle injury — status for next week unclear.",
    ],
  },
  playerOfTheGame: {
    playerId: "00-nel-cb1",
    playerName: "J. Bishop",
    wpa: 0.31,
    reason:
      "His third-quarter interception return for a touchdown was the single biggest swing play of the game and iced it before the fourth quarter even started.",
  },
};

export const teamStats: TeamStatSnapshot = {
  team: "NE",
  season: 2026,
  epaPerPlay: {
    offense: { value: 0.08, leagueRank: 9, leaguePercentile: 75 },
    defense: { value: -0.05, leagueRank: 11, leaguePercentile: 68 },
  },
  successRate: {
    offense: { value: 0.47, leagueRank: 10, leaguePercentile: 72 },
    defense: { value: 0.39, leagueRank: 8, leaguePercentile: 78 },
  },
  explosivePlayRate: {
    offense: { value: 0.11, leagueRank: 14, leaguePercentile: 57 },
    defense: { value: 0.08, leagueRank: 6, leaguePercentile: 84 },
  },
  pointDifferential: { value: 19, leagueRank: 8, leaguePercentile: 76 },
  pythagoreanWinPct: 0.63,
  redZonePct: {
    offense: { value: 0.68, leagueRank: 7, leaguePercentile: 79 },
    defense: { value: 0.52, leagueRank: 12, leaguePercentile: 63 },
  },
  thirdDownPct: {
    offense: { value: 0.44, leagueRank: 9, leaguePercentile: 73 },
    defense: { value: 0.33, leagueRank: 5, leaguePercentile: 87 },
  },
  twoMinuteDrillEpa: {
    offense: { value: 0.21, leagueRank: 6, leaguePercentile: 83 },
    defense: { value: -0.02, leagueRank: 16, leaguePercentile: 50 },
  },
  splits: {
    home: { wins: 1, losses: 0, epaPerPlay: 0.14 },
    away: { wins: 1, losses: 0, epaPerPlay: 0.02 },
    divisional: { wins: 0, losses: 0 },
  },
  specialTeams: {
    fieldGoalPct: { value: 0.92, leagueRank: 4, leaguePercentile: 88 },
    netPuntingAvg: { value: 43.1, leagueRank: 10, leaguePercentile: 71 },
    kickReturnAvg: { value: 22.4, leagueRank: 18, leaguePercentile: 44 },
    puntReturnAvg: { value: 8.9, leagueRank: 13, leaguePercentile: 59 },
    specialTeamsEpa: { value: 0.03, leagueRank: 9, leaguePercentile: 74 },
  },
};

export const positionGroupReportCards: PositionGroupReportCard[] = [
  { group: "QB", grade: 78, trend: "up", soWhat: "Efficient, protecting the ball — top-10 turnover-worthy play rate." },
  { group: "RB", grade: 71, trend: "flat", soWhat: "Solid between the tackles, not yet a explosive-play threat." },
  { group: "WR", grade: 62, trend: "down", soWhat: "Separation has been inconsistent — below-average target depth." },
  { group: "TE", grade: 69, trend: "up", soWhat: "Emerging as a reliable third-down safety valve." },
  { group: "OL", grade: 74, trend: "up", soWhat: "Best unit on the team right now — top-10 pressure rate allowed." },
  { group: "Edge", grade: 66, trend: "flat", soWhat: "Generating pressure without finishing — sacks lag win rate." },
  { group: "Interior DL", grade: 70, trend: "up", soWhat: "Run defense has been stout early — top-10 stuff rate." },
  { group: "LB", grade: 60, trend: "down", soWhat: "Coverage has been a soft spot against tight ends." },
  { group: "Secondary", grade: 73, trend: "up", soWhat: "Ball-hawking early — leads league in turnover-worthy pass breakups." },
];

export const qbDeepDive: QBDeepDive = {
  playerId: "00-nel-qb1",
  playerName: "D. Maye",
  team: "NE",
  attempts: 62,
  completions: 41,
  yards: 512,
  tds: 4,
  ints: 1,
  cpoe: 4.2,
  accuracyByDepth: { short: 0.78, medium: 0.61, deep: 0.38 },
  pressureEpa: -0.04,
  cleanPocketEpa: 0.31,
  turnoverWorthyPlayRate: 0.021,
  ranks: {
    cpoe: { value: 4.2, leagueRank: 9, leaguePercentile: 74 },
    turnoverWorthyPlayRate: { value: 0.021, leagueRank: 12, leaguePercentile: 65 },
    cleanPocketEpa: { value: 0.31, leagueRank: 6, leaguePercentile: 84 },
    pressureEpa: { value: -0.04, leagueRank: 14, leaguePercentile: 58 },
  },
};

export const qbLeagueTable: QBDeepDive[] = [
  qbDeepDive,
  { playerId: "00-pit-qb1", playerName: "A. Rodgers", team: "PIT", attempts: 58, completions: 37, yards: 470, tds: 3, ints: 2, cpoe: 1.1, accuracyByDepth: { short: 0.72, medium: 0.55, deep: 0.29 }, pressureEpa: -0.12, cleanPocketEpa: 0.18, turnoverWorthyPlayRate: 0.034 },
  { playerId: "00-buf-qb1", playerName: "J. Allen", team: "BUF", attempts: 55, completions: 39, yards: 601, tds: 5, ints: 0, cpoe: 6.8, accuracyByDepth: { short: 0.81, medium: 0.66, deep: 0.44 }, pressureEpa: 0.05, cleanPocketEpa: 0.42, turnoverWorthyPlayRate: 0.011 },
  { playerId: "00-kc-qb1", playerName: "P. Mahomes", team: "KC", attempts: 60, completions: 42, yards: 555, tds: 4, ints: 1, cpoe: 5.5, accuracyByDepth: { short: 0.79, medium: 0.63, deep: 0.4 }, pressureEpa: 0.02, cleanPocketEpa: 0.38, turnoverWorthyPlayRate: 0.017 },
];

export const depthChart: DepthChartEntry[] = [
  { position: "QB", players: [{ playerId: "00-nel-qb1", playerName: "D. Maye", rank: 1 }, { playerId: "00-nel-qb2", playerName: "J. Brissett", rank: 2 }] },
  { position: "RB", players: [{ playerId: "00-nel-rb1", playerName: "R. Stevenson", rank: 1 }, { playerId: "00-nel-rb2", playerName: "A. Elliott", rank: 2 }] },
  { position: "WR", players: [{ playerId: "00-nel-wr1", playerName: "K. Boutte", rank: 1 }, { playerId: "00-nel-wr2", playerName: "D. Douglas", rank: 2 }, { playerId: "00-nel-wr3", playerName: "P. Bourne", rank: 3 }] },
  { position: "TE", players: [{ playerId: "00-nel-te1", playerName: "H. Henry", rank: 1 }] },
  { position: "LT", players: [{ playerId: "00-nel-lt1", playerName: "W. Campbell", rank: 1 }] },
  { position: "CB", players: [{ playerId: "00-nel-cb1", playerName: "J. Bishop", rank: 1 }, { playerId: "00-nel-cb2", playerName: "C. Gonzalez", rank: 2 }] },
];

export const injuries: InjuryReportEntry[] = [
  {
    playerId: "00-nel-rt1",
    playerName: "M. Wallace",
    position: "RT",
    week: 2,
    injury: "Ankle",
    practiceStatus: "Limited",
    gameStatus: "Questionable",
    lastUpdated: "2026-09-18",
  },
  {
    playerId: "00-nel-lb2",
    playerName: "S. Barrett",
    position: "LB",
    week: 2,
    injury: "Hamstring",
    practiceStatus: "Full",
    gameStatus: "Probable",
    lastUpdated: "2026-09-18",
  },
];

export const opponentInjuries: InjuryReportEntry[] = [
  {
    playerId: "00-pit-cb1",
    playerName: "S. Reed",
    position: "CB",
    week: 2,
    injury: "Knee",
    practiceStatus: "Did Not Participate",
    gameStatus: "Out",
    lastUpdated: "2026-09-18",
  },
];

// Position-group matchup grades, the matchup-of-the-week callout, and
// head-to-head/weather/betting context are still illustrative placeholders —
// they need the roster + play-by-play position-group grading work and the
// ESPN injury feed from Phase 2. opponent/gameId below are kept in sync with
// the real upcoming opponent (data/generated/next-game.json) so this page
// never contradicts the real schedule, even before those grades are real.
export const opponentMatchup: OpponentMatchupData = {
  gameId: "2026_02_PIT_NE",
  opponent: "PIT",
  opponentEpaRank: { offense: 24, defense: 19 },
  positionGroupMatchups: [
    { group: "WR vs CB", ourGrade: 62, theirGrade: 41, edge: "us", note: "Their CB2 is starting in place of an injured starter — target this side early." },
    { group: "OL vs Edge", ourGrade: 74, theirGrade: 58, edge: "us", note: "Our pass protection should hold up against a middling pass rush." },
    { group: "RB vs Front 7", ourGrade: 71, theirGrade: 66, edge: "us", note: "Slight edge, but their run defense has tightened the last two weeks." },
    { group: "Secondary vs WR", ourGrade: 73, theirGrade: 60, edge: "us", note: "Our ball-hawking corners against a receiver corps that's turnover-prone on contested catches." },
    { group: "Our LB vs Their TE", ourGrade: 60, theirGrade: 68, edge: "them", note: "Their receiving tight end has been our defense's one soft spot all season." },
  ],
  matchupOfTheWeek: {
    title: "WR1 vs backup CB2",
    description:
      "With Pittsburgh's top cornerback ruled out, their CB2 grades bottom-10 in coverage over the last three weeks. Expect a heavy target share to our WR1 on that side of the field.",
  },
  opponentInjuries,
  recentForm: { last3EpaPerPlay: -0.03, last5EpaPerPlay: -0.01, seasonEpaPerPlay: -0.02 },
  headToHead: [
    { season: 2025, result: "W", score: "24-17" },
    { season: 2025, result: "W", score: "27-14" },
  ],
  weather: { tempF: 71, wind: "8 mph", precipitation: "0%", isDome: false },
  bettingContext: { spread: -3.5, overUnder: 44.5, asOf: "2026-09-18" },
  previewTake:
    "This is exactly the kind of game we need after last week. Pittsburgh's missing their top corner and it shows — their CB2 has been a liability all month, so if our WR1 doesn't have a big day I'll be surprised. Still feels a little nervy on defense against their tight end, but I like our matchups everywhere else. Let's get to 2-0.",
};

export const schedule: ScheduleRow[] = [
  { gameId: "2026-w01-CIN", week: 1, opponent: "CIN", homeAway: "away", opponentRecord: "1-1", opponentPointDiff: 3, opponentEpaRank: 14, strengthOfSchedule: { season: 0.51, opponentSos: 0.49 }, restDays: 7, opponentRestDays: 7, isDivisional: false, isConference: true, result: "W", ourScore: 27, theirScore: 20, date: "2026-09-06" },
  { gameId: "2026-w02-MIA", week: 2, opponent: "MIA", homeAway: "home", opponentRecord: "1-1", opponentPointDiff: -2, opponentEpaRank: 21, strengthOfSchedule: { season: 0.5, opponentSos: 0.47 }, restDays: 7, opponentRestDays: 7, isDivisional: true, isConference: true, result: "W", ourScore: 24, theirScore: 17, date: "2026-09-13" },
  { gameId: "2026-w03-NYJ", week: 2, opponent: "NYJ", homeAway: "away", opponentRecord: "0-2", opponentPointDiff: -19, opponentEpaRank: 27, strengthOfSchedule: { season: 0.49, opponentSos: 0.44 }, restDays: 7, opponentRestDays: 7, isDivisional: true, isConference: true, winProbabilityEstimate: 0.66, date: "2026-09-20" },
  { gameId: "2026-w04-SF", week: 4, opponent: "SF", homeAway: "home", opponentRecord: "2-0", opponentPointDiff: 21, opponentEpaRank: 3, strengthOfSchedule: { season: 0.52, opponentSos: 0.58 }, restDays: 7, opponentRestDays: 7, isDivisional: false, isConference: false, winProbabilityEstimate: 0.41, date: "2026-09-27" },
  { gameId: "2026-w05-BUF", week: 5, opponent: "BUF", homeAway: "away", opponentRecord: "2-0", opponentPointDiff: 15, opponentEpaRank: 4, strengthOfSchedule: { season: 0.53, opponentSos: 0.55 }, restDays: 7, opponentRestDays: 7, isDivisional: true, isConference: true, winProbabilityEstimate: 0.35, date: "2026-10-04" },
  { gameId: "2026-w06-NO", week: 6, opponent: "NO", homeAway: "home", opponentRecord: "0-2", opponentPointDiff: -14, opponentEpaRank: 29, strengthOfSchedule: { season: 0.52, opponentSos: 0.42 }, restDays: 7, opponentRestDays: 7, isDivisional: false, isConference: false, winProbabilityEstimate: 0.72, date: "2026-10-11" },
];

export const projection: SeasonProjection = {
  projectedWins: 10,
  projectedLosses: 7,
  playoffOdds: 0.58,
};

export const divisionStandings: DivisionStanding[] = [
  { team: "BUF", wins: 2, losses: 0, ties: 0, pointDifferential: 20, isUs: false, streak: { result: "W", count: 2 }, divisionRecord: { wins: 1, losses: 0, ties: 0 } },
  { team: "NE", wins: 2, losses: 0, ties: 0, pointDifferential: 10, isUs: true, streak: { result: "W", count: 2 }, divisionRecord: { wins: 1, losses: 0, ties: 0 } },
  { team: "MIA", wins: 1, losses: 1, ties: 0, pointDifferential: -2, isUs: false, streak: { result: "L", count: 1 }, divisionRecord: { wins: 0, losses: 1, ties: 0 } },
  { team: "NYJ", wins: 0, losses: 2, ties: 0, pointDifferential: -19, isUs: false, streak: { result: "L", count: 2 }, divisionRecord: { wins: 0, losses: 1, ties: 0 } },
];

export const leagueStandings: LeagueDivisionGroup[] = [
  { division: "AFC East", standings: divisionStandings },
  {
    division: "NFC East",
    standings: [
      { team: "PHI", wins: 2, losses: 0, ties: 0, pointDifferential: 24, isUs: false, streak: { result: "W", count: 2 }, divisionRecord: { wins: 1, losses: 0, ties: 0 } },
      { team: "DAL", wins: 1, losses: 1, ties: 0, pointDifferential: 3, isUs: false, streak: { result: "W", count: 1 }, divisionRecord: { wins: 0, losses: 1, ties: 0 } },
      { team: "WAS", wins: 1, losses: 1, ties: 0, pointDifferential: -5, isUs: false, streak: { result: "L", count: 1 }, divisionRecord: { wins: 1, losses: 0, ties: 0 } },
      { team: "NYG", wins: 0, losses: 2, ties: 0, pointDifferential: -22, isUs: false, streak: { result: "L", count: 2 }, divisionRecord: { wins: 0, losses: 1, ties: 0 } },
    ],
  },
];

export const leagueEpaRankings: LeagueEpaRanking[] = [
  { team: "BUF", offenseEpa: 0.15, offenseRank: 1, defenseEpa: -0.02, defenseRank: 9 },
  { team: "NE", offenseEpa: 0.13, offenseRank: 2, defenseEpa: -0.03, defenseRank: 12 },
  { team: "PHI", offenseEpa: 0.1, offenseRank: 3, defenseEpa: -0.09, defenseRank: 2 },
  { team: "JAX", offenseEpa: -0.05, offenseRank: 24, defenseEpa: -0.12, defenseRank: 1 },
  { team: "NYJ", offenseEpa: -0.09, offenseRank: 30, defenseEpa: 0.08, defenseRank: 28 },
];

export const leagueScoreboard: LeagueScoreboardGame[] = [
  { gameId: "2026_01_SF_LA", week: 1, date: "2026-09-04", weekday: "Thursday", homeTeam: "LA", awayTeam: "SF", homeScore: 7, awayScore: 27, homeRecord: "0-1", awayRecord: "1-0", overtime: false },
  { gameId: "2026_01_NE_SEA", week: 1, date: "2026-09-09", weekday: "Wednesday", homeTeam: "SEA", awayTeam: "NE", homeScore: 13, awayScore: 10, homeRecord: "1-0", awayRecord: "0-1", overtime: false },
  { gameId: "2026_01_DAL_PHI", week: 1, date: "2026-09-07", weekday: "Sunday", homeTeam: "PHI", awayTeam: "DAL", homeScore: 24, awayScore: 20, homeRecord: "1-0", awayRecord: "0-1", overtime: true },
];

export const news: NewsItem[] = [
  {
    id: "n1",
    publishedAt: "2026-09-19T14:00:00Z",
    type: "Injury",
    headline: "RT Wallace limited again Friday, questionable vs. Steelers",
    summary:
      "Wallace has missed the last two practices with an ankle issue picked up in Week 1. Coaches called him 'trending in the right direction' but stopped short of guaranteeing his availability.",
    sourceUrl: "https://www.espn.com/",
    sourceName: "ESPN",
    relatedPlayerIds: ["00-nel-rt1"],
  },
  {
    id: "n2",
    publishedAt: "2026-09-18T18:30:00Z",
    type: "Analysis",
    headline: "Why the run game is finally clicking up front",
    summary:
      "A deeper look at the interior line splits that turned a middling rushing attack into a top-10 unit through two weeks.",
    sourceUrl: "https://www.espn.com/",
    sourceName: "ESPN",
  },
  {
    id: "n3",
    publishedAt: "2026-09-17T20:00:00Z",
    type: "Transaction",
    headline: "Patriots sign veteran DT to practice squad",
    summary:
      "New England added depth on the interior defensive line, a position that's already grading out as a season-long strength.",
    sourceUrl: "https://www.espn.com/",
    sourceName: "ESPN",
  },
  {
    id: "n4",
    publishedAt: "2026-09-16T12:00:00Z",
    type: "Beat Report",
    headline: "Practice notes: rookie CB getting first-team reps",
    summary:
      "With the secondary playing well, the staff is still rotating young corners in with the ones — a sign of the position's early-season depth.",
    sourceUrl: "https://www.espn.com/",
    sourceName: "ESPN",
  },
];

export const beatDigest: BeatDigest = {
  text: "Beat writers are cautiously optimistic this week — the interior O-line splits are getting real praise as the story behind the run game finally clicking, and the secondary's early-season depth keeps coming up as a strength even with a rookie corner rotating in. The one thing everyone's watching heading into Sunday is RT Wallace's ankle, which has kept him out of practice the last two days after he picked it up in Week 1.",
  asOf: "2026-09-19T14:00:00Z",
};

export const leagueNews: NewsItem[] = [
  {
    id: "ln1",
    publishedAt: "2026-09-19T16:00:00Z",
    type: "Analysis",
    headline: "Fantasy football rankings Week 3: PPR and superflex",
    summary: "Our analysts break down the top waiver-wire targets and start/sit calls heading into Week 3 across the league.",
    sourceUrl: "https://www.espn.com/nfl/",
    sourceName: "ESPN",
  },
  {
    id: "ln2",
    publishedAt: "2026-09-19T12:00:00Z",
    type: "Injury",
    headline: "Star QB questionable for Sunday with ankle injury",
    summary: "A limited practice window this week has the team's status murky heading into the weekend slate.",
    sourceUrl: "https://www.espn.com/nfl/",
    sourceName: "ESPN",
  },
];
