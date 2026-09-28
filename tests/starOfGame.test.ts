import test from "node:test";
import assert from "node:assert/strict";
import { starOfGame } from "../scripts/lib/pbp";

type Row = Record<string, string>;
// nflverse's wpa is from the offense's side (posteam).
const play = (o: Partial<Row>): Row => ({ posteam: "NE", defteam: "BUF", play_type: "pass", wpa: "0", sack: "0", interception: "0", ...o });

test("a receiver can be player of the game (he used to be ignored)", () => {
  const s = starOfGame(
    [
      play({ passer_player_id: "QB", receiver_player_id: "WR", receiver_player_name: "R.Doubs", wpa: "0.12" }),
      play({ passer_player_id: "QB", receiver_player_id: "TE", wpa: "-0.08" }),
    ],
    "NE"
  );
  assert.equal(s?.playerId, "WR");
  assert.equal(s?.role, "receiving");
});

test("a defender is credited with the play's WPA flipped to our side", () => {
  const s = starOfGame(
    [play({ posteam: "BUF", defteam: "NE", interception: "1", interception_player_id: "CB", wpa: "-0.10" })],
    "NE"
  );
  assert.equal(s?.playerId, "CB");
  assert.ok(Math.abs(s!.wpa - 0.1) < 1e-9);
  assert.equal(s?.role, "defense");
});

test("a strip-sack credits the defender once, not as sacker and fumble-forcer", () => {
  const s = starOfGame(
    [
      play({
        posteam: "BUF", defteam: "NE", sack: "1", wpa: "-0.104",
        sack_player_id: "DT", forced_fumble_player_1_player_id: "DT", forced_fumble_player_1_team: "NE",
      }),
    ],
    "NE"
  );
  assert.ok(Math.abs(s!.wpa - 0.104) < 1e-9);
});

test("a split sack gives each defender half", () => {
  const s = starOfGame(
    [play({ posteam: "BUF", defteam: "NE", sack: "1", wpa: "-0.08", half_sack_1_player_id: "A", half_sack_2_player_id: "B" })],
    "NE"
  );
  assert.ok(Math.abs(s!.wpa - 0.04) < 1e-9);
});

test("kickers and returners count", () => {
  const kick = starOfGame([play({ play_type: "field_goal", kicker_player_id: "K", wpa: "0.3" })], "NE");
  assert.equal(kick?.role, "kicking");
  const punt = starOfGame(
    [play({ posteam: "BUF", defteam: "NE", play_type: "punt", punt_returner_player_id: "PR", wpa: "-0.05" })],
    "NE"
  );
  assert.equal(punt?.playerId, "PR");
  assert.equal(punt?.role, "returns");
});

test("the opponent's players are never credited", () => {
  const s = starOfGame([play({ posteam: "BUF", defteam: "NE", passer_player_id: "ALLEN", wpa: "0.4" })], "NE");
  assert.equal(s, null);
});
