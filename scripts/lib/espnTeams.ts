// ESPN's numeric team IDs, keyed by nflverse abbreviation. Verified against
// ESPN's /apis/site/v2/sports/football/nfl/teams listing. Needed to fetch
// any given opponent's roster/injuries — nflverse abbreviations mostly
// match ESPN's own, except LA (Rams) -> ESPN "LAR" and WAS -> ESPN "WSH".
export const ESPN_TEAM_ID: Record<string, string> = {
  ARI: "22", ATL: "1", BAL: "33", BUF: "2", CAR: "29", CHI: "3",
  CIN: "4", CLE: "5", DAL: "6", DEN: "7", DET: "8", GB: "9",
  HOU: "34", IND: "11", JAX: "30", KC: "12", LAC: "24", LA: "14",
  LV: "13", MIA: "15", MIN: "16", NE: "17", NO: "18", NYG: "19",
  NYJ: "20", PHI: "21", PIT: "23", SEA: "26", SF: "25", TB: "27",
  TEN: "10", WAS: "28",
};
