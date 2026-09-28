import test from "node:test";
import assert from "node:assert/strict";
import { checkGrounding } from "../scripts/lib/aiChecks";

// Every "catches" case below is text that actually shipped.

test("catches a road game placed in Foxborough", () => {
  const p = checkGrounding("The Jaguars came to Foxboro and dismantled us.", { facts: "", isHome: false });
  assert.equal(p.length, 1);
});

test("allows Foxborough for a home game", () => {
  assert.deepEqual(checkGrounding("A win in Foxborough.", { facts: "", isHome: true }), []);
});

test("catches an invented first name", () => {
  const p = checkGrounding("Remy Stevenson salvaged something.", {
    facts: "",
    playerNames: ["Rhamondre Stevenson"],
  });
  assert.match(p[0], /Remy Stevenson/);
});

test("allows the surname alone or after an ordinary word", () => {
  const ctx = { facts: "", playerNames: ["Rhamondre Stevenson"] };
  assert.deepEqual(checkGrounding("When Stevenson broke loose, the Patriots Stevenson era looked bright.", ctx), []);
  assert.deepEqual(checkGrounding("Rhamondre Stevenson ran hard.", ctx), []);
});

test("catches play-by-play's abbreviated names", () => {
  assert.equal(checkGrounding("R.Stevenson led the team.", { facts: "" }).length, 1);
});

test("catches a tenure claim that wasn't given, allows one that was", () => {
  assert.equal(checkGrounding("the second-year quarterback", { facts: "" }).length, 1);
  assert.deepEqual(
    checkGrounding("the second-year quarterback", { facts: "Maye, a second-year QB, said…" }),
    []
  );
});

test("catches franchise-history claims and unsourced years", () => {
  assert.equal(checkGrounding("600 wins deep in franchise history", { facts: "" }).length, 1);
  assert.equal(checkGrounding("the best start since 2001", { facts: "" }).length, 1);
  assert.deepEqual(checkGrounding("a rematch of the 2025 finale", { facts: "2025: W 23-20" }), []);
});

test("clean text passes", () => {
  const text =
    "New England won 20-3 at home. Drake Maye was efficient and TreVeyon Henderson scored.";
  assert.deepEqual(
    checkGrounding(text, { facts: "", isHome: true, playerNames: ["Drake Maye", "TreVeyon Henderson"] }),
    []
  );
});

test("catches 'historically' claims off a season-to-date sample", () => {
  assert.equal(checkGrounding("Buffalo's run defense is historically bad.", { facts: "" }).length, 1);
});

test("catches a month that doesn't match the game's date", () => {
  const facts = "Date: Sunday, September 20 (2026-09-20).";
  assert.equal(checkGrounding("ugly wins are what you need in October", { facts }).length, 1);
  assert.deepEqual(checkGrounding("a September statement win", { facts }), []);
  // An ISO date alone is enough to allow its month.
  assert.deepEqual(checkGrounding("an early September win", { facts: "2026-09-20" }), []);
});

test("catches the prompt leaking into the prose", () => {
  assert.equal(checkGrounding("The articles mention two straight games of clock trouble.", { facts: "" }).length, 1);
});

test("time-of-day words must fit the kickoff", () => {
  assert.equal(checkGrounding("a grim afternoon in Seattle", { facts: "", kickoffEt: "20:20" }).length, 1);
  assert.deepEqual(checkGrounding("a grim night in Seattle", { facts: "", kickoffEt: "20:20" }), []);
  assert.deepEqual(checkGrounding("a long afternoon in Jacksonville", { facts: "", kickoffEt: "13:00" }), []);
  // No kickoff given: any time-of-day word is a guess.
  assert.equal(checkGrounding("all afternoon", { facts: "" }).length, 1);
  // The kickoff line itself doesn't license the word.
  assert.equal(
    checkGrounding("under the lights", { facts: "Kickoff: 1:00 PM ET (an afternoon game).", kickoffEt: "13:00" }).length,
    1
  );
});
