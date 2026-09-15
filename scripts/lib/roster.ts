import { loadCsv, num } from "./csv";

export interface RosterRow {
  season: string;
  team: string;
  position: string;
  depth_chart_position: string;
  jersey_number: string;
  status: string;
  full_name: string;
  gsis_id: string;
  espn_id: string;
  headshot_url: string;
  week: string;
}

export async function loadTeamRoster(team: string): Promise<RosterRow[]> {
  const all = await loadCsv<RosterRow>("roster_2026.csv");
  const teamRows = all.filter((r) => r.team === team);
  const latestWeek = Math.max(...teamRows.map((r) => num(r.week)));
  return teamRows.filter((r) => num(r.week) === latestWeek);
}

export async function buildLeagueRosterByGsis(): Promise<Map<string, RosterRow>> {
  const all = await loadCsv<RosterRow>("roster_2026.csv");
  const sorted = [...all].sort((a, b) => num(a.week) - num(b.week));
  const byGsis = new Map<string, RosterRow>();
  for (const r of sorted) {
    // Later weeks overwrite earlier ones so we end up with each player's
    // most recent team/position snapshot.
    if (r.gsis_id) byGsis.set(r.gsis_id, r);
  }
  return byGsis;
}
