# The Foxboro Beacon — Stats & Methodology Breakdown

A plain-English guide to what's on the site, where the numbers come from, and — the thing that actually matters for trusting them — **which numbers are "pure this season" and which are blended with last year's data.**

---

## The three-tier weighting system

Every stat on the site falls into one of three tiers. This is the single most important thing to understand about how the site works.

**Tier 1 — Opponent-adjusted + blended with 2025 (predictive numbers).**
Used where the site is making a forward-looking claim ("who's going to win," "how tough is this matchup"). Early in the season, 1-2 games of pure current-season data is too noisy to trust on its own, so these numbers blend in real 2025 performance, linearly phased out to zero by game 4 (by Week 5, it's 100% current season, no 2025 left in the number). Where: **win probability, playoff odds, Schedule's "Opp EPA Rank," Next Game's "Opponent EPA Rank," and the Matchups tab's 5 position-group grades.**

**Tier 2 — Opponent-adjusted, current-season only, NOT blended (descriptive numbers).**
Used where the site is describing "how good has this team actually been this year" — deliberately not diluted with 2025 data, even though that means more noise early in the season. Where: **Home page's Team Strength EPA cards, Around the League's power rankings.**

**Tier 3 — Opponent-adjusted and regressed to the league mean, current-season only (position/player-level numbers).**
Used for QB Deep Dive and Position Grades. These get the same leave-one-out opponent adjustment as Tier 2 (a unit that faced three top-five defenses shouldn't be graded as though it played nobody), then every per-play value is shrunk toward the plays-weighted league mean by sample size before ranking (see `scripts/lib/shrink.ts`), because they run on far thinner samples than team-level stats. A TE grade can come off 10 targets; without shrinkage that's noise rendered as precision. No prior-season blend — these describe this year. Cards built on thin samples say so explicitly in the UI.

**What "opponent-adjusted" means, concretely:** a defense doesn't just get credit for "opponents scored X EPA against us" — it gets compared against what those same opponents do in their *other* games. Shutting down a normally-explosive offense counts for more than shutting down a team that's bad against everybody. (This was tightened up this session — see "Recent fixes" below.)

---

## Page by page

### Home

| What you see | Tier | Real source |
|---|---|---|
| Record, division rank, streak | — | Real game results (`games.csv`) |
| Playoff odds | Tier 1 | Logistic curve on projected win total (see "The honest models" below) |
| Team Strength — Point Differential | — | Real, unweighted box-score total |
| Team Strength — Offensive/Defensive EPA/play | **Tier 2** | Opponent-adjusted, pure 2026, **has the "last N weeks" filter** |
| AFC East standings | — | Real |
| Latest headlines | — | Real, from ESPN + Patriots' own RSS |

### Recap (index + per game)

Every completed game, permanently archived (fixed this session — it used to only keep the most recent one). Real box score, EPA/play, turnover margin, explosive-play rate, red zone/3rd down splits, win-probability chart across the game, Player of the Game (by win probability added). The narrative "Fan Take" and Good/Bad/Ugly are **AI-written, but grounded** — the model is handed the real computed numbers and real fetched articles and told explicitly never to invent a stat, quote, or event.

### Next Game

- **Preview tab**: Opponent EPA rank (**Tier 1**), AI preview take (grounded, same rules as recaps), Matchup of the Week callout.
- **Matchups tab**: 5 position-group grades — rush offense vs. run defense, pass offense vs. pass defense, pass protection vs. pass rush, and both mirrored on defense. **Tier 1** (opponent-adjusted + blended).
- **Injuries tab**: Both teams' real Wed/Thu/Fri practice status, pulled directly from patriots.com's own injury article (the one thing ESPN/nflverse can't give same-day).

### Schedule

Full season table. Opponent record and EPA rank are **Tier 1**. "Opp's SOS" (strength of schedule) is a simple real average of that opponent's own opponents' point differential — not EPA-based, not weighted. Win probability on unplayed games uses the same model as playoff odds.

### News

AI beat-writer digest (grounded, same rules), merged ESPN + Patriots RSS feed, injury report widget.

### Roster & Stats

- **QB tab** — Drake Maye's real per-play stats: CPOE, turnover-worthy rate, pressure-vs-clean-pocket EPA split, accuracy by depth of target, completion %. **Tier 3**, plus a **"last N games" filter** (every N from 1 game up to games played) and a **head-to-head compare tool** against any other starting QB in the league.
- **Position Grades tab** — 8 real groups, each a 0-100 league percentile. **Tier 3.** A one-glance summary strip sits above the tabs. Also has the **"last N games" filter**, and a **compare tool** (new this session) letting you put any group against any other team's same group, with the real underlying number shown alongside the percentile (EPA/play for QB/RB/WR/TE, the relevant rate stat for the rest).
- **Splits & Special Teams** — situational splits (home/away/divisional, red zone, 3rd down, 2-minute drill), kicking/return stats.
- **Depth Chart** — real roster order (file order, not an authoritative starter ranking — nflverse doesn't publish one).

### Around the League

League-wide power rankings — **Tier 2**, deliberately "who's been best in 2026," no 2025 mixed in. All 8 divisions' standings, last week's scores, AI-curated top league headlines (real trades/injuries/storylines, fantasy content filtered out).

---

## What each position grade actually measures (the honest version)

All eight are opponent-adjusted and sample-shrunk. The honest distinction is not the math — it's **whether the card is really about a position group at all.**

| Card | What it measures | Genuinely per-position? |
|---|---|---|
| QB | EPA/dropback, attributed via `passer_id` | Yes |
| RB | EPA/carry, via `rusher_id` | Yes |
| WR / TE | EPA/target, via `receiver_id` | Yes, but see the confound below |
| Pass Protection | Pressure rate allowed (sacks + QB hits) | **No — team-wide**, and partly the QB's own time to throw |
| Pass Rush | Sack rate generated | **No — team-wide.** Edge rushers, interior linemen and blitzers all included |
| Run Defense | Rush EPA allowed | **No — team-wide.** Front seven and run-support safeties together |
| Pass Defense | Pass EPA allowed | **No — team-wide.** Coverage and pass rush aren't separable in this data |

Those bottom four were previously labelled **OL, Edge, Interior DL and Secondary**, which promised something free data cannot deliver: real per-position grading needs every player charted on every snap, which is PFF's entire business. They're now named for what they measure. "Secondary 94" read as "our defensive backs are elite" when it meant "our pass defense has been good" — and a good share of that is the same pass rush the Pass Rush card was separately taking credit for, so the two cards were partly counting one fact twice.

**Per-player context:** each of those four also shows real per-player sack, QB hit, tackle-for-loss, forced-fumble, interception and pass-defensed totals with a named leader, from nflverse's own attribution columns.

**Two grades carry honest caveats in the UI:**

- **RB and TE are marked "noisy stat."** Measured against the *completed* 2025 season (`npm run calibrate:shrink 2025`), RB EPA/carry has a reliability of 0.41 and TE EPA/target 0.29, against 0.74–0.77 for the team-level EPA metrics. Most of what separates teams on those two is noise even in January — rushing efficiency being largely blocking, scheme and game script is a long-standing public finding, and tight end target volume is simply too low to separate 32 teams. The grades stay, because they're the best answer the data supports; they just shouldn't be read with the same confidence as the QB number beside them.
- **WR/TE EPA per target mostly measures the quarterback.** A receiver catching passes from an accurate QB grades well whatever he does. So those cards carry a second, QB-independent measure built from FTN charting — catch rate on balls charted *catchable*, yards after catch, drops, contested targets. See "Only ranking what's measurable" below for why that one often shows counts instead of a percentile.

**LB has no card.** It used to show a fabricated grade merged in from fixture data. No free metric cleanly isolates linebacker play, so the site shows nothing there rather than something invented. `scripts/verify-data.ts` asserts no LB card can come back.

**LB has no card.** It used to show a fabricated grade and an invented claim about the defense, merged in from fixture data. No free metric cleanly isolates linebacker play, so the site now shows nothing there rather than something made up.

---

## The honest models (things that are estimates, framed as estimates)

- **Win probability** (Schedule's unplayed games): `tanh(net EPA differential × 2.5)`, plus a small home-field bump, clamped to [10%, 90%]. Explicitly a rough heuristic, not a real predictive model — kept deliberately mild-scaled so early-season small-sample EPA gaps don't saturate to 10%/90% on nearly every game.
- **Playoff odds**: a smooth logistic curve centered on ~9.5 projected wins (a typical wildcard cutoff in a 17-game season). Not a real conference-wide playoff simulation.
- **Season projection**: current wins/losses + the sum of your own per-game win probabilities on the remaining schedule.

---

## Data sources

- **nflverse** (`nflverse/nflverse-data` on GitHub, free, CC-BY 4.0): play-by-play (the source of every EPA/success-rate/explosive-play number — EPA itself is nflverse's own pre-computed column, not something built from scratch here), weekly rosters, official injury reports, and **FTN's real per-play charting data** (used specifically for `is_qb_fault_sack`, to know whether a sack was the OL's fault or the QB holding the ball).
- **ESPN's public endpoints**: news, scoreboard/odds, standings fallback.
- **patriots.com**: the team's own injury-report article, parsed for real Wed/Thu/Fri practice status (same-day accurate, which nflverse's periodic release can't match).
- **Pro Football Rumors / Pro Football Talk RSS**: league-wide headline sourcing for Around the League.

## AI content — where it's used and the rule it follows

Fan Take (recaps), preview takes (Next Game), and the beat digest (News) are the only AI-*written* content on the site. Every one of them follows the same rule: the model is handed real computed stats and real fetched article text, and told explicitly never to invent a stat, quote, injury, or event. Everything else on the site — every number, every rank, every badge — is computed directly from real data, no AI involved.

## Refresh schedule

Four scheduled runs: ~5am ET daily (catches Thursday/Monday night games), ~5pm ET Sunday (after early games), ~1am ET Monday (after the full Sunday slate including Sunday Night), and ~1pm ET Monday (added this session — nflverse's play-by-play file isn't actually finalized until roughly midday Monday, which is why the League tab used to look "half-updated" right after Sunday).

## The recent-form filter — how it works and why no database

Three places have it: QB Deep Dive, Team Strength, Position Grades. It offers **last game, last 3, last 5** — a fixed set, not one window per game played. It used to build every N from 1 up to games played, which was two options in Week 2 and nineteen by Week 17, almost all of them ("Last 13 Games") things nobody wants. Last-1/3/5 is what ESPN, PFF and the fantasy tools settle on, because it's what people actually reason in. A window only appears once it differs from the full season: at exactly 3 games played, "Last 3 Games" *is* the season, so offering both would be two names for one number.

Each window is precomputed at build time, not queried live — nflverse hosts each season's play-by-play as one complete, re-fetchable file, so there's no need for a database to slice it arbitrarily. QB and Position Grades windows are simple raw slices (no cross-team math involved). Team Strength's windows are calendar-week-based rather than per-team-game-count, specifically so the real opponent-adjustment math stays valid across teams with different bye weeks — full explanation is in the code comments if you ever want the details (`scripts/lib/statWindows.ts`).

## Only ranking what's measurable

Shrinking toward the league mean stops one small-sample team from outranking a well-measured one. It does **not** stop a ranking that's entirely noise: when the whole league is small-sample, every team gets pulled by roughly the same weight, the ordering survives almost intact, and the table still looks authoritative.

So before any league rank is published for the receiver-isolated metrics, the site compares the spread actually observed between teams against the spread random chance alone would produce at those sample sizes (`scripts/lib/reliability.ts` — a one-way intraclass correlation). Two games into 2026, WR catch-rate-on-catchable scored **0.00**: teams differed by *less* than coin-flipping explains. The raw table ran 80% to 100% and looked like a real ladder. It wasn't one — New England sat 3rd, and flipping a single drop moved them to 16th.

Below a reliability of 0.55 the card shows raw counts instead ("20 of 21 catchable balls caught · 1 drop · 3.9 YAC/rec") and says why there's no rank. Replaying the completed 2025 season week by week, a single 0.5 threshold made the rank blink on at Week 8, off at Week 10, and back on at Week 14 — reliability is itself an estimate off 32 team means and wobbles ±0.06. So the gate has hysteresis: it opens at 0.55, stays until it falls under 0.40, and the decision persists per season in `data/generated/metric-gates.json`.

`npm run calibrate:shrink 2025` measures the shrinkage constants against a finished season rather than leaving them as four numbers picked by feel. The hand-picked values turned out 5–18× too small — so if anything the shrink was too weak. It barely matters either way, because the site displays percentile *ranks* and shrinking every team toward the same mean is nearly order-preserving: swapping K=40 for K=221 moves grades by at most 6 points.

---

## Guarding against numbers that are wrong but self-consistent

Three counting stats shipped wrong, and no internal check could have caught any of them — the site's numbers agreed with each other perfectly and simply didn't match football:

- A **fumble on a reception** was attributed to nobody, because fumbles were read off rushing rows only.
- The count was of fumbles **lost**, not fumbles, so one that bounced out of bounds never appeared.
- **Every QB scramble in the league** was dropped — 141 of 1,675 run plays — because nflverse leaves `rusher_id` empty on those rows and only fills `rusher_player_id`. Drake Maye's rushing line read 1 carry for 3 yards. It was 11 for 64.

All three were found by a reader noticing a number looked wrong, which is the worst way to find them. So `scripts/verify-data.ts` now diffs the leaderboards against **nflverse's own season aggregation of the same games** — carries, yards, TDs, receptions, targets, and fumbles per play type. An independently-produced aggregation is the only thing that catches this whole class. It found a fourth discrepancy within a minute of existing (kneels, which every official box score counts as carries).

It also asserts cross-file agreement: team EPA must match the league rankings file to 1e-9, position-group cards must match the league table, and no LB card may exist. CI gates on it, and on 108 unit tests (`npm test`) covering the shrinkage, prior-blend taper, win probability, reliability gate, window construction and the stat math.

---

## Recent fixes this session, if useful context

- **EPA opponent-adjustment bug**: a defense's "adjustment baseline" (what its opponents do in their other games) had no protection against small samples — a single fluky opponent game, common in Week 1-2, could get trusted at full face value. This is what let NE briefly show as the #1 pass offense in the NFL despite a negative raw EPA/play. Fixed by shrinking thin-sample baselines toward the league average, same statistical idea as regression-to-the-mean.
- **Recap archive**: used to silently overwrite itself down to just the most recent game. Now every completed game stays archived permanently.
- **OL grade**: was pure sack rate. Now blends in a real pressure-rate signal (sacks + QB hits) so a lineman who gets beaten but is bailed out by a quick throw doesn't get a free pass.

---

*Generated for personal reference — not part of the site's source.*
