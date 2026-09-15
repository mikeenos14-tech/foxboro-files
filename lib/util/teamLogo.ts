// ESPN serves team logos at a predictable URL keyed by team abbreviation —
// no API call needed, just the right abbreviation. nflverse's abbreviations
// match ESPN's for every team except these two (verified against ESPN's
// /teams listing and nflverse's games.csv).
const NFLVERSE_TO_ESPN_ABBR: Record<string, string> = {
  LA: "lar",
  WAS: "wsh",
};

export function teamLogoUrl(nflverseAbbr: string): string {
  const espnAbbr = NFLVERSE_TO_ESPN_ABBR[nflverseAbbr] ?? nflverseAbbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${espnAbbr}.png`;
}
