import { num } from "./csv";

export type GameRow = Record<string, string>;

export interface TeamRecord {
  team: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
}

function isPlayed(g: GameRow): boolean {
  return g.home_score !== "" && g.away_score !== "" && g.home_score !== undefined;
}

export function computeStandings(
  games: GameRow[],
  season: number
): Map<string, TeamRecord> {
  const table = new Map<string, TeamRecord>();

  const get = (team: string): TeamRecord => {
    if (!table.has(team)) {
      table.set(team, { team, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 });
    }
    return table.get(team)!;
  };

  for (const g of games) {
    if (num(g.season) !== season || g.game_type !== "REG" || !isPlayed(g)) continue;
    const home = num(g.home_score);
    const away = num(g.away_score);
    const h = get(g.home_team);
    const a = get(g.away_team);
    h.pointsFor += home;
    h.pointsAgainst += away;
    a.pointsFor += away;
    a.pointsAgainst += home;
    if (home > away) {
      h.wins++;
      a.losses++;
    } else if (away > home) {
      a.wins++;
      h.losses++;
    } else {
      h.ties++;
      a.ties++;
    }
  }

  return table;
}

export function recordString(r: TeamRecord | undefined): string {
  if (!r) return "0-0";
  return r.ties > 0 ? `${r.wins}-${r.losses}-${r.ties}` : `${r.wins}-${r.losses}`;
}

export function pointDiff(r: TeamRecord | undefined): number {
  if (!r) return 0;
  return r.pointsFor - r.pointsAgainst;
}
