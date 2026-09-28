# The Foxboro Beacon — Stats & Methodology Breakdown

A plain-English guide to what's on the site, where the numbers come from, and — the thing that actually matters for trusting them — **which numbers are "pure this season" and which are blended with last year's data.**

---

## The three-tier weighting system

Every stat on the site falls into one of three tiers. This is the single most important thing to understand about how the site works.

**Tier 1 — Opponent-adjusted + blended with 2025 (predictive numbers).**
Used where the site is making a forward-looking claim ("who's going to win," "how tough is this matchup"). Early in the season, 1-2 games of pure current-season data is too noisy to trust on its own, so these numbers blend in real 2025 performance, linearly phased out to zero by game 4 (by Week 5, it's 100% current season, no 2025 left in the number). Where: **win probability, playoff odds, Schedule's "Opp EPA Rank," Next Game's "Opponent EPA Rank," and the Matchups tab's 5 position-group grades.**

**Tier 2 — Opponent-adjusted, current-season only, NOT blended (descriptive numbers).**
Used where the site is describing "how good has this team actually been this year" — deliberately not diluted with 2025 data, even though that means more noise early in the season. Where: **Home page's Team Strength EPA cards, Around the League's offense and defense rankings.**

**Tier 3 — Opponent-adjusted and regressed to the league mean, current-season only (position/player-level numbers).**
Used for QB Deep Dive and Position Grades. These get the same leave-one-out opponent adjustment as Tier 2 (a unit that faced three top-five defenses shouldn't be graded as though it played nobody), then every per-play value is shrunk toward the plays-weighted league mean by sample size before ranking (see `scripts/lib/shrink.ts`), because they run on far thinner samples than team-level stats. A TE grade can come off 10 targets; without shrinkage that's noise rendered as precision. No prior-season blend — these describe this year. Cards built on thin samples say so explicitly in the UI.

**What "opponent-adjusted" means, concretely:** a defense doesn't just get credit for "opponents scored X EPA against us" — it gets compared against what those same opponents do in their *other* games. Shutting down a normally-explosive offense counts for more than shutting down a team that's bad against everybody. (This was tightened up this session — see "Recent fixes" below.)

---

## Page by page

### Home

| What you see | Tier | Real source |
|---|---|---|
| Record, division rank, streak | — | Real game results (`games.csv`) |
| Playoff odds | Tier 1 | Logistic curve on projected win total (see "The honest models" below). Says how much still leans on 2025 until game 4 |
| Team Strength — Point Differential | — | Real, unweighted box-score total |
| Team Strength — Offensive/Defensive EPA/play | **Tier 2** | Opponent-adjusted, pure 2026, **has the "last N weeks" filter** |
| AFC East standings | — | Records from `games.csv`; ties ordered by ESPN's official standings (real NFL tiebreakers) |
| Latest headlines | — | Real, from ESPN + Patriots' own RSS |

### Recap (index + per game)

Every completed game, permanently archived, each with its own page (older recap pages used to 404, and the list showed older games with no score). Real box score, EPA/play, turnover margin, explosive-play rate, red zone/3rd down splits, win-probability chart across the game, Player of the Game (by win probability added). The narrative "Fan Take" and Good/Bad/Ugly are **AI-written, but grounded** — the model is handed the real computed numbers, where the game was played, full player names, how the points were scored and league-average benchmarks, and its draft is checked in code before it's saved (see "AI content" below).

### Next Game

- **Preview tab**: Opponent EPA rank as "Nth of 32" (**Tier 1**), AI preview take (grounded, same rules as recaps), Matchup of the Week callout.
- **Matchups tab**: 5 unit grades out of 100 — rush offense vs. run defense, pass offense vs. pass defense, pass protection vs. pass rush, and both mirrored on defense. **Tier 1** (opponent-adjusted + blended). Also recent form (Last Game / Last 3 / Last 5 once they differ from the season) and the head-to-head record.
- **Injuries tab**: the league's official report (nflverse) once it's out for the game, with patriots.com's same-day practice status merged in. Before that — usually Monday to Wednesday — it falls back to ESPN, keeping only designations made after each team's last game and never healthy scratches. If there are none yet, it says the report isn't out rather than showing last week's list.

### Schedule

Full season table, laid out to fit a phone. Opponent record and overall EPA rank (offense minus defense) are **Tier 1**. Win chance on unplayed games uses the same model as playoff odds. (An "Opp's SOS" column was removed — it took a paragraph to explain and didn't tell a fan anything.)

### News

AI beat-writer digest (grounded, same rules and checks), merged ESPN + Patriots RSS feed tagged Injury / Transaction / Beat Report / Analysis, injury report widget.

### Roster & Stats

- **QB tab** — Drake Maye's official box score (attempts exclude sacks and two-point tries, yards are gross — matching nflverse exactly), plus per-play stats: CPOE, turnover-worthy rate, EPA when hit or sacked vs. when not hit, accuracy by depth of target. **Tier 3**, plus the **Last Game / Last 3 / Last 5 / 2025 Season filter** and a **head-to-head compare tool** against any other starting QB in the league.
- **Grades tab** — 8 real groups, each graded out of 100 against the league (a percentile, written "65/100" so it can't be mistaken for a rank). **Tier 3.** Also has the recent-form filter, a trend arrow (last game vs. season, 10-point threshold), and a **compare tool** putting any group against any other team's, with each team's actual unadjusted rate shown under the grade (EPA/play for QB/RB/WR/TE, the relevant rate for the rest).
- **Splits & Special Teams** — situational splits (home/away/divisional, red zone, 3rd down, 2-minute drill), kicking/return stats.
- **Depth Chart** — the team's depth chart as published by ESPN, by offense, defense and special teams. (It used to be nflverse's roster-file order numbered as if it were a depth chart, which listed Tommy DeVito as QB1.)

### Around the League

**Every Team, Every Unit** — pick any of the eight units and see all 32 teams ranked by grade, New England highlighted, with each team's actual (unadjusted) rate alongside. Same grades as the Roster page (**Tier 3**, 2026 only), so the two always agree. Home's grade chips and each Roster grade card link straight to the matching ranking. RB and TE carry the noisy-stat note here too.

League-wide offense and defense rankings by EPA/play — **Tier 2**, deliberately "who's been best in 2026," no 2025 mixed in. All 8 divisions' standings, last week's scores, AI-curated top league headlines (real trades/injuries/storylines, fantasy content filtered out).

---

## What each position grade actually measures (the honest version)

All eight are opponent-adjusted and sample-shrunk. The honest distinction is not the math — it's **whether the card is really about a position group at all.**

| Card | What it measures | Genuinely per-position? |
|---|---|---|
| QB | EPA/dropback, attributed via `passer_id` | Yes |
| RB | EPA/carry, via `rusher_id` | Yes |
| WR / TE | EPA/target, via `receiver_id` | Yes, but see the confound below |
| Pass Protection | Sack + QB-hit rate allowed (free data has no hurries, so this isn't "pressure" in the PFF sense) | **No — team-wide**, and partly the QB's own time to throw |
| Pass Rush | Sack rate generated | **No — team-wide.** Edge rushers, interior linemen and blitzers all included |
| Run Defense | Rush EPA allowed | **No — team-wide.** Front seven and run-support safeties together |
| Pass Defense | Pass EPA allowed | **No — team-wide.** Coverage and pass rush aren't separable in this data |

Those bottom four were previously labelled **OL, Edge, Interior DL and Secondary**, which promised something free data cannot deliver: real per-position grading needs every player charted on every snap, which is PFF's entire business. They're now named for what they measure. "Secondary 94" read as "our defensive backs are elite" when it meant "our pass defense has been good" — and a good share of that is the same pass rush the Pass Rush card was separately taking credit for, so the two cards were partly counting one fact twice.

**What's changed about "free data can't do this" (September 2026):** two free nflverse datasets narrow the gap, but neither closes it.

- `pbp_participation` lists all 22 players on the field for every play. That allows on/off comparisons ("pass defense with vs. without this safety"), not true individual grades — being on the field isn't the same as winning your matchup. It's also **only published through 2025**; there's no 2026 file yet, so it can't feed this season's pages.
- `nextgen_stats` (player tracking) *is* published for 2026, updated weekly, and now used — see "Next Gen Stats" below.

**Per-player context:** the three defensive cards show team-wide totals with a named leader — sacks and QB hits (Pass Rush), tackles for loss and forced fumbles (Run Defense), interceptions and pass breakups (Pass Defense) — from nflverse's own attribution columns. These used to count only one position group, so Pass Rush said "4 sacks" for a team with 7.

**Two grades carry honest caveats in the UI:**

- **RB and TE are marked "noisy stat."** Measured against the *completed* 2025 season (`npm run calibrate:shrink 2025`), RB EPA/carry has a reliability of 0.41 and TE EPA/target 0.29, against 0.74–0.77 for the team-level EPA metrics. Most of what separates teams on those two is noise even in January — rushing efficiency being largely blocking, scheme and game script is a long-standing public finding, and tight end target volume is simply too low to separate 32 teams. The grades stay, because they're the best answer the data supports; they just shouldn't be read with the same confidence as the QB number beside them.
- **WR/TE EPA per target mostly measures the quarterback.** A receiver catching passes from an accurate QB grades well whatever he does. So those cards carry a second, QB-independent measure built from FTN charting — catch rate on balls charted *catchable*, yards after catch, drops, contested targets. See "Only ranking what's measurable" below for why that one often shows counts instead of a percentile.

**LB has no card.** It used to show a fabricated grade and an invented claim about the defense, merged in from fixture data. No free metric cleanly isolates linebacker play, so the site shows nothing there rather than something invented. `scripts/verify-data.ts` asserts no LB card can come back.

---

## Next Gen Stats (player tracking)

NFL Next Gen Stats, via nflverse, answers questions play-by-play can't. Only NGS's own season totals are used (its "week 0" rows), which cover players over NGS's minimums — roughly 25 attempts for a QB, 15 carries for a runner, 8 targets for a receiver. Every rank says "of N qualified", because 37 qualified QBs isn't the same ladder as 32 teams.

| Where | Stat | Why it's there |
|---|---|---|
| QB tab, QB compare | Time to throw | Separates "the line broke down" from "the QB held it" |
| QB tab, QB compare | Tight-window throws (NGS "aggressiveness") | Share of throws with a defender within a yard — how much risk he takes |
| Pass Protection card | Our QB's time to throw and rank | The card's own caveat is that sacks are partly the QB's hold time; this measures it |
| Leaders — receiving | Separation | How open a receiver gets, independent of the throw |
| Leaders — rushing | Rush yards over expected per carry | The part of a run that's the runner, not the blocking |

Time to throw and tight-window rate are shown in neutral colors, not green/red: they describe style, not quality. NGS isn't blended with anything or used in any grade.

NGS also publishes completions, attempts, yards, TDs and INTs for every qualified QB, so `verify:data` checks the site's QB lines against it as a second independent source alongside nflverse's own totals.

---

## The honest models (things that are estimates, framed as estimates)

- **Win probability** (Schedule's unplayed games): `tanh(net EPA differential × 2.5)`, plus a small home-field bump, clamped to [10%, 90%]. Explicitly a rough heuristic, not a real predictive model — kept deliberately mild-scaled so early-season small-sample EPA gaps don't saturate to 10%/90% on nearly every game.
- **Playoff odds**: a smooth logistic curve centered on ~9.5 projected wins (a typical wildcard cutoff in a 17-game season), fed the unrounded projected total. Not a real conference-wide playoff simulation.
- **Season projection**: current wins/losses + the sum of your own per-game win probabilities on the remaining schedule.

---

## Data sources

- **nflverse** (`nflverse/nflverse-data` on GitHub, free, CC-BY 4.0): play-by-play (the source of every EPA/success-rate/explosive-play number — EPA itself is nflverse's own pre-computed column, not something built from scratch here), weekly rosters, official injury reports, and **FTN's real per-play charting data** — turnover-worthy throws, play-action, blitz and pocket splits, and catchable/drop/contested flags for receivers. FTN lands a game or more behind the play-by-play, so every FTN-based number uses only charted games for both halves of the rate, and the page says when charting trails the games played. Also nflverse's own per-player season stats, used only by `verify:data`.
- **NFL Next Gen Stats** (via nflverse, weekly): time to throw, tight-window throws, receiver separation, rush yards over expected.
- **ESPN's public endpoints**: news, scoreboard/odds, the depth chart, the injury fallback, and the official standings order (used only to break ties).
- **patriots.com**: the team's own injury-report article, parsed for real Wed/Thu/Fri practice status (same-day accurate, which nflverse's periodic release can't match).
- **Pro Football Rumors / Pro Football Talk RSS**: league-wide headline sourcing for Around the League.

## AI content — where it's used and the rule it follows

Fan Take (recaps), preview takes (Next Game), and the beat digest (News) are the only AI-*written* content on the site. Every one of them follows the same rule: the model is handed real computed stats and real fetched article text, and told explicitly never to invent a stat, quote, injury, or event. Everything else on the site — every number, every rank, every badge — is computed directly from real data, no AI involved.

A prompt rule isn't enforcement, so every draft also goes through narrow checks in code (`scripts/lib/aiChecks.ts`) before it's saved: a road game placed in Foxborough, a first name that doesn't match the player given ("Remy Stevenson"), play-by-play abbreviations ("R.Stevenson"), "second-year"-style tenure claims, franchise-history claims, and years that weren't in the facts. A failing draft is retried once with the problems listed, and if it still fails the previous text is kept. Each of those checks exists because that exact error shipped. Recaps record which prompt version wrote them (`aiVersion`), so a prompt fix rewrites older recaps too.

One error class was fixed at the source rather than checked: grades used to print as ordinals ("6th"), so a 6th-percentile run defense — one of the league's worst — was described as the "6th-ranked" one. Grades are now always "N/100" and ranks always "Nth of 32", in the UI and in what the model is given.

## Refresh schedule

Four scheduled runs: ~5am ET daily (catches Thursday/Monday night games), ~5pm ET Sunday (after early games), ~1am ET Monday (after the full Sunday slate including Sunday Night), and ~1pm ET Monday (added this session — nflverse's play-by-play file isn't actually finalized until roughly midday Monday, which is why the League tab used to look "half-updated" right after Sunday).

## The recent-form filter — how it works and why no database

Four places have it: QB Deep Dive, Team Strength, Position Grades, and Next Game's recent form. It offers **last game, last 3, last 5** — a fixed set, not one window per game played. It used to build every N from 1 up to games played, which was two options in Week 2 and nineteen by Week 17, almost all of them ("Last 13 Games") things nobody wants. Last-1/3/5 is what ESPN, PFF and the fantasy tools settle on, because it's what people actually reason in. A window only appears once it differs from the full season: at exactly 3 games played, "Last 3 Games" *is* the season, so offering both would be two names for one number.

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

All three were found by a reader noticing a number looked wrong, which is the worst way to find them. So `scripts/verify-data.ts` now diffs the site against **nflverse's own season aggregation of the same games** — carries, yards, TDs, receptions, targets, fumbles per play type; every starting QB's completions, attempts, yards, TDs and INTs; the defense board's sacks, QB hits, TFL, INT, pass breakups and forced fumbles; and the frozen 2025 QB line. An independently-produced aggregation is the only thing that catches this whole class. It found a fourth discrepancy within a minute of existing (kneels, which every official box score counts as carries).

The passing check was added after a fourth self-consistent error shipped: nflverse marks sacks as pass attempts, the site counted them, and Maye read 51/89 for 547 yards when the real line was 51/80 for 585. Every QB in the league was off. The same pass found the 2025 snapshot had folded in the playoffs (5,222 yards for a 4,394-yard season). All play-by-play is now filtered to the regular season at load.

It also asserts cross-file agreement: team EPA must match the league rankings file to 1e-9, position-group cards must match the league table, and no LB card may exist. If nflverse's stats file is missing it fails rather than passing having checked nothing. CI gates on it, and on the unit tests (`npm test`) covering the shrinkage, prior-blend taper, win probability, reliability gate, window construction, box-score rule, AI checks and the stat math.

---

## Recent fixes this session, if useful context

- **EPA opponent-adjustment bug**: a defense's "adjustment baseline" (what its opponents do in their other games) had no protection against small samples — a single fluky opponent game, common in Week 1-2, could get trusted at full face value. This is what let NE briefly show as the #1 pass offense in the NFL despite a negative raw EPA/play. Fixed by shrinking thin-sample baselines toward the league average, same statistical idea as regression-to-the-mean.
- **Recap archive**: used to silently overwrite itself down to just the most recent game. Now every completed game stays archived permanently.
- **Pass Protection grade** (formerly "OL"): was pure sack rate. Now uses sacks + QB hits, so a lineman who gets beaten but is bailed out by a quick throw doesn't get a free pass.

---

*Generated for personal reference — not part of the site's source.*
