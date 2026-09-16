// Static team reference. Conference/division alignment is long-stable
// structural knowledge (not derived from a data file), same approach the
// build plan called for a hardcoded 32-entry team table.

export const TEAM_CONFERENCE: Record<string, "AFC" | "NFC"> = {
  BUF: "AFC", MIA: "AFC", NE: "AFC", NYJ: "AFC",
  BAL: "AFC", CIN: "AFC", CLE: "AFC", PIT: "AFC",
  HOU: "AFC", IND: "AFC", JAX: "AFC", TEN: "AFC",
  DEN: "AFC", KC: "AFC", LV: "AFC", LAC: "AFC",
  DAL: "NFC", NYG: "NFC", PHI: "NFC", WAS: "NFC",
  CHI: "NFC", DET: "NFC", GB: "NFC", MIN: "NFC",
  ATL: "NFC", CAR: "NFC", NO: "NFC", TB: "NFC",
  ARI: "NFC", LA: "NFC", SF: "NFC", SEA: "NFC",
};

export const TEAM_DIVISION: Record<string, string> = {
  BUF: "AFC East", MIA: "AFC East", NE: "AFC East", NYJ: "AFC East",
  BAL: "AFC North", CIN: "AFC North", CLE: "AFC North", PIT: "AFC North",
  HOU: "AFC South", IND: "AFC South", JAX: "AFC South", TEN: "AFC South",
  DEN: "AFC West", KC: "AFC West", LV: "AFC West", LAC: "AFC West",
  DAL: "NFC East", NYG: "NFC East", PHI: "NFC East", WAS: "NFC East",
  CHI: "NFC North", DET: "NFC North", GB: "NFC North", MIN: "NFC North",
  ATL: "NFC South", CAR: "NFC South", NO: "NFC South", TB: "NFC South",
  ARI: "NFC West", LA: "NFC West", SF: "NFC West", SEA: "NFC West",
};

export const ALL_TEAMS = Object.keys(TEAM_CONFERENCE);

// Lowercase nickname each team is referred to by in headline text (ESPN
// news copy says "Cowboys' defense," never "DAL's defense"). Used for
// headline-level team detection — e.g. spotting that two differently-worded
// stories are both about the same team, so they can be treated as one story.
export const TEAM_NICKNAMES: Record<string, string> = {
  BUF: "bills", MIA: "dolphins", NE: "patriots", NYJ: "jets",
  BAL: "ravens", CIN: "bengals", CLE: "browns", PIT: "steelers",
  HOU: "texans", IND: "colts", JAX: "jaguars", TEN: "titans",
  DEN: "broncos", KC: "chiefs", LV: "raiders", LAC: "chargers",
  DAL: "cowboys", NYG: "giants", PHI: "eagles", WAS: "commanders",
  CHI: "bears", DET: "lions", GB: "packers", MIN: "vikings",
  ATL: "falcons", CAR: "panthers", NO: "saints", TB: "buccaneers",
  ARI: "cardinals", LA: "rams", SF: "49ers", SEA: "seahawks",
};
