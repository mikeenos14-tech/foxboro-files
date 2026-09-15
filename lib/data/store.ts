// Single data-access abstraction. Phase 0 reads hand-written fixtures;
// Phase 1+ swaps these function bodies to read scripts/build-data.ts's
// generated JSON (local disk in dev, Vercel Blob in production) without
// any page or component needing to change.

import * as fixtures from "./fixtures";
import type {
  Game,
  GameRecap,
  InjuryReportEntry,
  NewsItem,
  OpponentMatchupData,
  PositionGroupReportCard,
  QBDeepDive,
  ScheduleRow,
  SeasonProjection,
  Team,
  TeamStatSnapshot,
  DepthChartEntry,
} from "./types";

export async function getTeam(): Promise<Team> {
  return fixtures.team;
}

export async function getLastGame(): Promise<Game> {
  return fixtures.lastGame;
}

export async function getNextGame(): Promise<Game> {
  return fixtures.nextGame;
}

export async function getLastGameRecap(): Promise<GameRecap> {
  return fixtures.lastGameRecap;
}

export async function getRecapByGameId(
  gameId: string
): Promise<GameRecap | null> {
  return fixtures.lastGameRecap.gameId === gameId
    ? fixtures.lastGameRecap
    : null;
}

export async function getAllRecaps(): Promise<
  Array<{ game: Game; recap: GameRecap }>
> {
  return [{ game: fixtures.lastGame, recap: fixtures.lastGameRecap }];
}

export async function getTeamStats(): Promise<TeamStatSnapshot> {
  return fixtures.teamStats;
}

export async function getPositionGroupReportCards(): Promise<
  PositionGroupReportCard[]
> {
  return fixtures.positionGroupReportCards;
}

export async function getQBDeepDive(): Promise<QBDeepDive> {
  return fixtures.qbDeepDive;
}

export async function getDepthChart(): Promise<DepthChartEntry[]> {
  return fixtures.depthChart;
}

export async function getSchedule(): Promise<ScheduleRow[]> {
  return fixtures.schedule;
}

export async function getSeasonProjection(): Promise<SeasonProjection> {
  return fixtures.projection;
}

export async function getOpponentMatchup(): Promise<OpponentMatchupData> {
  return fixtures.opponentMatchup;
}

export async function getInjuries(): Promise<InjuryReportEntry[]> {
  return fixtures.injuries;
}

export async function getNews(): Promise<NewsItem[]> {
  return fixtures.news;
}
