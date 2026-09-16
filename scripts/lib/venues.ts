// Static home-venue reference: coordinates (for weather forecasts) and
// whether the stadium is enclosed. Retractable-roof stadiums are marked as
// domes — there's no free, reliable source for a specific week's roof
// status this far ahead, and these roofs are closed for the vast majority
// of games, so "climate controlled" is the honest default rather than a
// guess at outdoor conditions that likely won't apply.
export const VENUES: Record<string, { name: string; lat: number; lon: number; isDome: boolean }> = {
  BUF: { name: "Highmark Stadium", lat: 42.7738, lon: -78.787, isDome: false },
  MIA: { name: "Hard Rock Stadium", lat: 25.958, lon: -80.2389, isDome: false },
  NE: { name: "Gillette Stadium", lat: 42.0909, lon: -71.2643, isDome: false },
  NYJ: { name: "MetLife Stadium", lat: 40.8135, lon: -74.0745, isDome: false },
  BAL: { name: "M&T Bank Stadium", lat: 39.278, lon: -76.6227, isDome: false },
  CIN: { name: "Paycor Stadium", lat: 39.0955, lon: -84.5161, isDome: false },
  CLE: { name: "Huntington Bank Field", lat: 41.5061, lon: -81.6995, isDome: false },
  PIT: { name: "Acrisure Stadium", lat: 40.4468, lon: -80.0158, isDome: false },
  DEN: { name: "Empower Field at Mile High", lat: 39.7439, lon: -105.0201, isDome: false },
  KC: { name: "GEHA Field at Arrowhead Stadium", lat: 39.0489, lon: -94.4839, isDome: false },
  LV: { name: "Allegiant Stadium", lat: 36.0909, lon: -115.1833, isDome: true },
  LAC: { name: "SoFi Stadium", lat: 33.9535, lon: -118.3392, isDome: true },
  JAX: { name: "EverBank Stadium", lat: 30.3239, lon: -81.6373, isDome: false },
  TEN: { name: "Nissan Stadium", lat: 36.1665, lon: -86.7713, isDome: false },
  IND: { name: "Lucas Oil Stadium", lat: 39.7601, lon: -86.1639, isDome: true },
  HOU: { name: "NRG Stadium", lat: 29.6847, lon: -95.4107, isDome: true },
  NO: { name: "Caesars Superdome", lat: 29.9511, lon: -90.0812, isDome: true },
  ATL: { name: "Mercedes-Benz Stadium", lat: 33.7554, lon: -84.4008, isDome: true },
  CAR: { name: "Bank of America Stadium", lat: 35.2258, lon: -80.8528, isDome: false },
  TB: { name: "Raymond James Stadium", lat: 27.9759, lon: -82.5033, isDome: false },
  DAL: { name: "AT&T Stadium", lat: 32.7473, lon: -97.0945, isDome: true },
  NYG: { name: "MetLife Stadium", lat: 40.8135, lon: -74.0745, isDome: false },
  PHI: { name: "Lincoln Financial Field", lat: 39.9008, lon: -75.1675, isDome: false },
  WAS: { name: "Northwest Stadium", lat: 38.9078, lon: -76.8645, isDome: false },
  CHI: { name: "Soldier Field", lat: 41.8623, lon: -87.6167, isDome: false },
  DET: { name: "Ford Field", lat: 42.34, lon: -83.0456, isDome: true },
  GB: { name: "Lambeau Field", lat: 44.5013, lon: -88.0622, isDome: false },
  MIN: { name: "U.S. Bank Stadium", lat: 44.9736, lon: -93.2575, isDome: true },
  ARI: { name: "State Farm Stadium", lat: 33.5276, lon: -112.2626, isDome: true },
  LA: { name: "SoFi Stadium", lat: 33.9535, lon: -118.3392, isDome: true },
  SF: { name: "Levi's Stadium", lat: 37.4032, lon: -121.9698, isDome: false },
  SEA: { name: "Lumen Field", lat: 47.5952, lon: -122.3316, isDome: false },
};
