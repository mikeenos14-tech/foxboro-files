// Good / Bad / Ugly built from the recap's own numbers — no AI.
//
// These used to be AI-written, and they were mostly restated stats ("held
// them to 2 of 11 on third down"), which is exactly where the model kept
// slipping: calling a 50% red-zone rate "better than the league's 55%",
// counting "four trips into the end zone", crediting a field goal from
// the 32 to a red-zone trip. Code states them without those errors. The
// AI still writes the short "Take", where the voice is the point.
//
// Each candidate gets a severity (how far from normal, in rough
// "standard" units); the strongest two goods and bads are kept, and a bad
// that's extreme enough becomes the Ugly.

import type { GameRecap } from "../../lib/data/types";

interface Bullet {
  kind: "good" | "bad";
  severity: number;
  text: string;
}

// League norms — the same ones the AI prompt uses.
const RED_ZONE_TD_NORM = 0.55;
const THIRD_DOWN_NORM = 0.4;

const pct = (x: number) => `${Math.round(x * 100)}%`;

function rateBullet(
  made: number,
  att: number,
  norm: number,
  side: "offense" | "defense",
  describe: (made: number, att: number) => string,
  minAttempts: number
): Bullet | null {
  if (att < minAttempts) return null;
  const rate = made / att;
  const diff = rate - norm;
  if (Math.abs(diff) < 0.1) return null; // within ten points of normal isn't news
  const good = side === "offense" ? diff > 0 : diff < 0;
  return {
    kind: good ? "good" : "bad",
    severity: Math.abs(diff) * 4 * Math.min(1, att / 6),
    text: `${describe(made, att)} (${pct(rate)}), well ${diff > 0 ? "above" : "below"} the ${pct(norm)} league norm.`,
  };
}

export function buildRecapBullets(
  recap: Pick<GameRecap, "epaPerPlay" | "turnoverMargin" | "redZone" | "thirdDown">,
  opponent: string
): GameRecap["goodBadUgly"] {
  const candidates: Array<Bullet | null> = [];
  const { offense: offEpa, defense: defEpa } = recap.epaPerPlay;

  if (Math.abs(offEpa) >= 0.05) {
    candidates.push({
      kind: offEpa > 0 ? "good" : "bad",
      severity: Math.abs(offEpa) * 6,
      text: `The offense averaged ${offEpa > 0 ? "+" : ""}${offEpa.toFixed(2)} EPA per play — ${offEpa > 0 ? "better" : "worse"} than an average offense.`,
    });
  }
  if (Math.abs(defEpa) >= 0.05) {
    candidates.push({
      kind: defEpa < 0 ? "good" : "bad",
      severity: Math.abs(defEpa) * 6,
      text: `The defense allowed ${defEpa > 0 ? "+" : ""}${defEpa.toFixed(2)} EPA per play — ${defEpa < 0 ? "better" : "worse"} than an average defense.`,
    });
  }

  const tm = recap.turnoverMargin;
  if (tm !== 0) {
    candidates.push({
      kind: tm > 0 ? "good" : "bad",
      severity: Math.abs(tm) * 0.9,
      text:
        tm > 0
          ? `Won the turnover battle by ${tm}.`
          : `Lost the turnover battle by ${-tm}${tm <= -2 ? " — too many extra possessions to hand an opponent" : ""}.`,
    });
  }

  candidates.push(
    rateBullet(
      recap.redZone.offense.td,
      recap.redZone.offense.att,
      RED_ZONE_TD_NORM,
      "offense",
      (m, a) => `Scored touchdowns on ${m} of ${a} red-zone trips`,
      2
    ),
    rateBullet(
      recap.redZone.defense.td,
      recap.redZone.defense.att,
      RED_ZONE_TD_NORM,
      "defense",
      (m, a) => `Allowed ${opponent} touchdowns on ${m} of ${a} red-zone trips`,
      2
    ),
    rateBullet(
      recap.thirdDown.offense.conv,
      recap.thirdDown.offense.att,
      THIRD_DOWN_NORM,
      "offense",
      (m, a) => `Converted ${m} of ${a} third downs`,
      6
    ),
    rateBullet(
      recap.thirdDown.defense.conv,
      recap.thirdDown.defense.att,
      THIRD_DOWN_NORM,
      "defense",
      (m, a) =>
        m / a > THIRD_DOWN_NORM
          ? `Let ${opponent} convert ${m} of ${a} third downs`
          : `Held ${opponent} to ${m} of ${a} on third down`,
      6
    )
  );

  // No Player of the Game bullet: its card sits directly above these.

  const real = candidates.filter((b): b is Bullet => b !== null);
  const byWeight = (a: Bullet, b: Bullet) => b.severity - a.severity;
  const good = real.filter((b) => b.kind === "good").sort(byWeight);
  const bad = real.filter((b) => b.kind === "bad").sort(byWeight);

  // The worst bad becomes the Ugly only when it's genuinely extreme.
  const ugly = bad.length > 0 && bad[0].severity >= 1.8 ? [bad.shift()!] : [];

  return {
    good: good.slice(0, 2).map((b) => b.text),
    bad: bad.slice(0, 2).map((b) => b.text),
    ugly: ugly.map((b) => b.text),
  };
}
