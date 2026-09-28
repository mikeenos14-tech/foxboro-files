import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseInjuryArticle } from "../scripts/lib/injuryArticle";

// Real patriots.com report bodies from Weeks 1-3 of 2026.
const fixture = (week: number) =>
  readFileSync(path.join(__dirname, "fixtures", `injury-article-week${week}.txt`), "utf8");

const row = (r: ReturnType<typeof parseInjuryArticle>, name: string) =>
  r?.players.find((p) => p.playerName === name);

test("uses the latest report day by date, though the article lists it first", () => {
  assert.equal(parseInjuryArticle(fixture(3), ["NE", "JAX"])?.day, "FRIDAY, SEPTEMBER 25, 2026");
  assert.equal(parseInjuryArticle(fixture(2), ["NE", "PIT"])?.day, "SATURDAY, SEPTEMBER 19, 2026");
});

test("Week 3: every listed player for both teams — the AI extraction returned 4 of 16", () => {
  const r = parseInjuryArticle(fixture(3), ["NE", "JAX"])!;
  assert.equal(r.players.filter((p) => p.team === "NE").length, 10);
  assert.equal(r.players.filter((p) => p.team === "JAX").length, 7);
  assert.deepEqual(row(r, "Albert Regis"), {
    team: "JAX", position: "DT", playerName: "Albert Regis", injury: "Elbow",
    practiceStatus: "Limited", gameStatus: "Doubtful",
  });
  // Positions as printed — the AI had rewritten LB as OLB.
  assert.equal(row(r, "Quintayvious Hutchins")?.position, "LB");
});

test("game designations carry the practice code in parentheses", () => {
  const r = parseInjuryArticle(fixture(3), ["NE", "JAX"])!;
  assert.equal(row(r, "Eli Raridon")?.practiceStatus, "Did Not Participate");
  assert.equal(row(r, "Eli Raridon")?.gameStatus, "Questionable");
  assert.equal(row(r, "Craig Woodson")?.practiceStatus, "Limited");
});

test("the run-on 'no game status' list, including its typos", () => {
  const r = parseInjuryArticle(fixture(3), ["NE", "JAX"])!;
  // "Knee (FP, CB Carlton Davis III" — missing parenthesis.
  assert.equal(row(r, "Dametrious Crownover")?.practiceStatus, "Full");
  assert.equal(row(r, "Carlton Davis III")?.practiceStatus, "Full");
  // "Elbow (FP), Groin" — the second injury after the code.
  assert.equal(row(r, "Robert Hainsey")?.injury, "Elbow, Groin");
  assert.equal(row(r, "Brenden Schooler")?.injury, "Back - NFI List");
  assert.equal(row(r, "Brenden Schooler")?.gameStatus, undefined);
});

test("a player listed twice with different statuses is left out, not guessed", () => {
  const r = parseInjuryArticle(fixture(3), ["NE", "JAX"])!;
  assert.deepEqual(r.conflicts, ["Branson Combs"]);
  assert.equal(row(r, "Branson Combs"), undefined);
});

test("a period between players, and initials that must not split", () => {
  const w2 = parseInjuryArticle(fixture(2), ["NE", "PIT"])!;
  assert.equal(row(w2, "Darnell Washington")?.injury, "Not Injury Related / Personal");
  assert.equal(row(w2, "Cameron Heyward")?.practiceStatus, "Full");
  const w1 = parseInjuryArticle(fixture(1), ["NE", "SEA"])!;
  assert.equal(row(w1, "A.J. Barner")?.injury, "Oblique");
  assert.equal(row(w1, "Josh Jones")?.injury, "Knee");
});

test("no practice code and no injury are allowed, not invented", () => {
  const r = parseInjuryArticle(fixture(1), ["NE", "SEA"])!;
  assert.deepEqual(row(r, "Ben Brown"), {
    team: "NE", position: "OL", playerName: "Ben Brown", injury: "Knee - Did not travel",
    practiceStatus: undefined, gameStatus: "Out",
  });
  assert.equal(row(r, "Christian Barmore")?.injury, "Not specified");
});

test("an article that doesn't match the template returns null", () => {
  assert.equal(parseInjuryArticle("Patriots practiced in pads today.", ["NE", "BUF"]), null);
});
