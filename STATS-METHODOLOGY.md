# The Foxboro Beacon — Stats & Methodology Breakdown

A plain-English guide to what's on the site, where the numbers come from, and — the thing that actually matters for trusting them — **which numbers are "pure this season" and which are blended with last year's data.**

---

## The three-tier weighting system

Every stat on the site falls into one of three tiers. This is the single most important thing to understand about how the site works.

**Tier 1 — Opponent-adjusted + blended with 2025 (predictive numbers).**
Used where the site is making a forward-looking claim ("who's going to win," "how tough is this matchup"). Early in the season, 1-2 games of pure current-season data is too noisy to trust on its own, so these numbers blend in real 2025 performance, linearly phased out to zero by game 4 (by Week 5, it's 100% current season, no 2025 left in the number). Where: **win probability, playoff odds, Schedule's "Opp EPA Rank," Next Game's "Opponent EPA Rank," and the Matchups tab's 5 position-group grades.**

**Tier 2 — Opponent-adjusted, current-season only, NOT blended (descriptive numbers).**
Used where the site is describing "how good has this team actually been this year" — deliberately not diluted with 2025 data, even though that means more noise early in the season. Where: **Home page's Team Strength EPA cards, the Offense and Defense views of Around the League's rankings.**

**Tier 3 — Opponent-adjusted and regressed to the league mean, current-season only (position/player-level numbers).**
Used for QB Deep Dive and Position Grades. These get the same leave-one-out opponent adjustment as Tier 2 (a unit that faced three top-five defenses shouldn't be graded as though it played nobody), then every per-play value is shrunk toward the plays-weighted league mean by sample size before ranking (see `scripts/lib/shrink.ts`), because they run on far thinner samples than team-level stats. A TE grade can come off 10 targets; without shrinkage that's noise rendered as precision. No prior-season blend — these describe this year. Cards built on thin samples say so explicitly in the UI.

**Outside the tiers — success rate.** The share of plays that improved the offense's chances of scoring (positive EPA, nflverse's own `success` column). It's always raw: never opponent-adjusted, never blended, so a team's success rate is the same number on every page. Where: **Home's Team Strength cards, Around the League's rankings, Next Game's Tale of the Tape, and every recap.** EPA says how much a team gains per play; success rate says how often it gains anything, so a team living on a few big plays shows up as high EPA with a low success rate.

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
| Team Strength — Success rate, yards/play | Raw | Pure 2026, ranked of 32, same filter |
| Week by Week chart | Raw | Each game's EPA/play gained and allowed — read straight from that game's recap, so the two always match. Not opponent-adjusted (one game is too thin). Appears from the second game |
| AFC East standings | — | Records from `games.csv`; ties ordered by ESPN's official standings (real NFL tiebreakers) |
| Latest headlines | — | Real, from ESPN + Patriots' own RSS |

### Recap (index + per game)

Every completed game, permanently archived, each with its own page (older recap pages used to 404, and the list showed older games with no score). Real box score, EPA/play, success rate for and against (with the league average this season), turnover margin, explosive-play rate, red zone/3rd down splits, win-probability chart across the game, and Player of the Game (see below). Tapping turnovers, explosive plays, red zone, third downs or Player of the Game lists the plays behind the number (see "See the plays").

**Good/Bad/Ugly is built from the stats in code** (`scripts/lib/recapBullets.ts`): each number is compared with its league norm, the furthest from normal become the bullets, and a bad one that's extreme enough becomes the Ugly. The Player of the Game isn't repeated as a bullet (its card sits right above), so after a lopsided loss the Good section can be empty — which is honest. These used to be AI-written, and restating numbers was exactly where the model slipped ("50% — better than the league's 55%", "four trips into the end zone"). The short **"Take" is the only AI-written part** of a recap — see "AI content" below.

**Player of the Game** is New England's leader in win probability added, crediting every Patriot directly involved in a play: passer and targeted receiver (each with the full play, as nflverse credits EPA), runner, the defender with the sack (half each on a split sack), interception or forced fumble, the kicker on field goals and extra points, and kick and punt returners. A player is credited at most once per play (a strip-sack names the same defender twice). It used to count only passers and runners, so no receiver, defender or kicker could win it; in 2026's first three games it went to Rhamondre Stevenson every week, and now goes to A.J. Brown, Romeo Doubs and Marcus Jones. The card says how it was earned ("mostly as a receiver").

### Next Game

- **Preview tab**: Tale of the Tape — each offense against the defense it faces, with both teams' EPA rank (**Tier 1**) and success rate (raw, this season only — the box says so while the EPA ranks still blend 2025); AI preview take (grounded, same rules as recaps), Matchup of the Week callout.
- **Matchups tab**: 5 unit grades out of 100 — rush offense vs. run defense, pass offense vs. pass defense, pass protection vs. pass rush, and both mirrored on defense. **Tier 1** (opponent-adjusted + blended). Also recent form (Last Game / Last 3 / Last 5 once they differ from the season) and the head-to-head record.
- **Injuries tab**: the league's official report (nflverse) once it's out for the game, with patriots.com's same-day practice status merged in (parsed in code — see "Data sources"). Before that — usually Monday to Wednesday — it falls back to ESPN, keeping only designations made after each team's last game and never healthy scratches. If there are none yet, it says the report isn't out rather than showing last week's list.

### Schedule

Full season table, laid out to fit a phone. Opponent record and overall EPA rank (offense minus defense) are **Tier 1**. Win chance on unplayed games uses the same model as playoff odds. (An "Opp's SOS" column was removed — it took a paragraph to explain and didn't tell a fan anything.)

### News

AI beat-writer digest (grounded, same rules and checks), merged ESPN + Patriots RSS feed tagged Injury / Transaction / Beat Report / Analysis, injury report widget.

### Roster & Stats

- **QB tab** — Drake Maye's official box score (attempts exclude sacks and two-point tries, yards are gross — matching nflverse exactly), plus per-play stats: CPOE, turnover-worthy rate, EPA when hit or sacked vs. when not hit, accuracy by depth of target. **Tier 3**, plus the **Last Game / Last 3 / Last 5 / 2025 Season filter** and a **head-to-head compare tool** against any other starting QB in the league.
- **Grades tab** — 8 real groups, each graded out of 100 against the league (a percentile, written "65/100" so it can't be mistaken for a rank). **Tier 3.** Also has the recent-form filter, a trend arrow (last game vs. season, 10-point threshold), and a **compare tool** putting any group against any other team's, with each team's actual unadjusted rate shown under the grade (EPA/play for QB/RB/WR/TE, the relevant rate for the rest).
- **Leaders** — receiving, rushing and defensive leaders; tapping a player lists every target, carry or defensive play behind his line.
- **Splits** — situational splits (home/away/divisional, red zone, 3rd down, 2-minute drill), kicking/return stats and penalties. Red zone, third downs, the two-minute drill, field goals and penalties each have a "See the plays" link for the season.
- **Depth Chart** — the team's depth chart as published by ESPN, by offense, defense and special teams. (It used to be nflverse's roster-file order numbered as if it were a depth chart, which listed Tommy DeVito as QB1.)

### Around the League

**Every Team, Ranked** — pick the whole offense, the whole defense (EPA/play, **Tier 2**, with success rate and its own rank) or any of the eight units and see all 32 teams ranked, New England highlighted, with each team's actual (unadjusted) rate alongside. Same grades as the Roster page (**Tier 3**, 2026 only), so the two always agree. Home's grade chips and each Roster grade card link straight to the matching ranking. RB and TE carry the noisy-stat note here too.

The Offense and Defense views are deliberately "who's been best in 2026," no 2025 mixed in. They used to be two separate 32-row tables below the picker. Division standings (AFC and NFC as tabs), last week's scores, AI-curated top league headlines (real trades/injuries/storylines, fantasy content filtered out).

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
- **patriots.com**: the team's own injury-report article, for same-day Wed/Thu/Fri practice status and the final game designations, which nflverse's periodic release can lag. **Parsed in code, not by AI** (`scripts/lib/injuryArticle.ts`): the latest report day by date (the article lists newest first), both teams, each designation with its practice code, and the run-on "no game status given" list. A player listed twice with conflicting statuses is left out rather than guessed. The AI extraction this replaced returned 4 of 16 players on the real Week 3 report, including none of the Jaguars. If the article stops matching the template, nothing is written and the official nflverse/ESPN data stands alone. Tested against the real Week 1-3 reports (`tests/fixtures/`).
- **Pro Football Rumors / Pro Football Talk RSS**: league-wide headline sourcing for Around the League.

## AI content — where it's used and the rule it follows

Three things are AI-written: a recap's short "Take", the Next Game preview, and the beat digest (News). Everything else — every number, rank, badge and bullet — is computed in code. The model is handed real computed facts and real article text and told never to invent anything; the facts come pre-described so it doesn't have to interpret them: where and when the game was played (including kickoff time), full player names, how the points were scored, each unit named with whose it is, ranks and EPA in words ("24th of 32 — below average"), each rate already compared with its league norm, and a counted head-to-head record.

A prompt rule isn't enforcement, so every draft goes through narrow checks in code (`scripts/lib/aiChecks.ts`) before it's saved. Each exists because that exact error shipped:

| Check | The error that prompted it |
|---|---|
| Road game placed in Foxborough | "The Jaguars came to Foxboro" — the game was in Jacksonville |
| First name that doesn't match the player given | "Remy Stevenson" |
| Play-by-play abbreviations | "R.Stevenson" (initials like "A.J." are allowed) |
| Tenure claims not in the facts | "the second-year quarterback" — Maye's third season |
| Franchise-history / "historic" claims | "600 wins deep in franchise history", "historically bad" off three games |
| Years not in the facts | invented "since 2001"-style history |
| A month that doesn't match the game date | "in October" for a Sept. 20 game |
| Time of day that contradicts kickoff | "all afternoon" for an 8:20pm opener |
| Referring to its own source material | "The articles mention…" |

A failing draft is retried once with the problems listed. If it still fails, **nothing is published**: a recap shows its plain computed summary and bullets, the preview is left off for that run. Older AI text is not kept as a fallback — it was once how known-wrong text stayed live. Recaps record which prompt version wrote them (`AI_VERSION`, `scripts/lib/aiVersion.ts`), so any prompt fix rewrites every older recap on the next run.

Every attempt is recorded — written, rejected (with each draft's failures), or no usable response — in `data/generated/ai-diagnostics.json` (stats job: recaps, preview) and `ai-diagnostics-news.json` (headlines job: digest). GitHub truncates the build log, so these files are how to see why something wasn't written.

No check list can catch everything a model might get wrong, so every AI block also has a **"Something look off? Flag it"** link that opens a pre-filled GitHub issue with the page, the section and the exact text shown.

One error class was fixed at the source rather than checked: grades used to print as ordinals ("6th"), so a 6th-percentile run defense — one of the league's worst — was described as the "6th-ranked" one. Grades are now always "N/100" and ranks always "Nth of 32", in the UI and in what the model is given.

## See the plays

Tapping a stat lists the exact plays behind it — on recaps (turnovers, explosive plays, red-zone trips grouped by trip, third downs, Player of the Game with each play's win-probability credit), on the Leaders tab (every target, carry or defensive play behind a player's line) and on the Splits tab (the season's red-zone trips, third downs, last-two-minute snaps, field-goal attempts and penalties). Each play shows quarter, clock, down and distance, the NFL's own play text, a result badge, and EPA from New England's side.

**A list always matches its number**, because both come from one selector: third downs, red-zone trips, turnovers, explosive plays, the two-minute drill, field goals and penalties are each a function in `scripts/lib/pbp.ts` that returns the plays, and the number is counted from what it returns. Player of the Game and the defensive counter record the plays they credit as they count. `verify:data` then checks every list against its number, for every game, every leader and every Splits row, and fails if one disagrees.

Recap lists (~25-35 KB per game, `plays-<gameId>.json`) are rendered with the page. The Leaders (`leader-plays.json`, ~100 KB) and Splits (`split-plays.json`, ~90 KB) lists are static files fetched only on the first tap.

## Refresh schedule

Four scheduled runs: ~5am ET daily (catches Thursday/Monday night games), ~5pm ET Sunday (after early games), ~1am ET Monday (after the full Sunday slate including Sunday Night), and ~1pm ET Monday (added this session — nflverse's play-by-play file isn't actually finalized until roughly midday Monday, which is why the League tab used to look "half-updated" right after Sunday).

## Keeping it current, and knowing when it isn't

`verify:data` checks the numbers are right; these check they're recent.

- **Every download is recorded.** Each fetch of each source (nflverse files, ESPN endpoints, RSS feeds) writes its last attempt and last success to `data/generated/source-status-<job>.json` — one file per job, since the stats and headlines jobs overlap and a shared file would make their commits conflict. In the automated jobs raw files aren't kept between runs, so "keep the last good copy" really means "missing": without this, a source could fail for days while every run reported success.
- **Freshness check** (`scripts/check-freshness.ts`), the last step of both jobs: in season, fails the run if a source it fetches hasn't succeeded within the job's limit (12 hours for headlines, 36 for stats), if a New England game that finished 30+ hours ago has no result, recap or plays, or if the "next game" has already been played. The data is still committed; the run shows red.
- **Sanity ranges** (in `verify:data`): rates between 0 and 100%, EPA in a real season's range, ranks 1-32, grades 0-100, league-wide wins equal losses and point differentials sum to zero, a 17-game schedule and a projected record that adds up to 17.
- **Daily health check** (`.github/workflows/health-check.yml`, ~11am ET): runs the freshness checks across both jobs, looks for any failed refresh in the last day, and compares the live site's `/api/build-meta` with the repo to catch a failed deploy. Problems open a GitHub issue ("Site health: problems found"), which emails the repo owner; it's commented on while problems persist and closes itself once a check passes.
- **Visitors are told.** The footer's "Stats last updated" uses when play-by-play was last actually downloaded (not when the build ran), and in season turns into a warning after 36 hours. It's worked out in the visitor's browser, since most pages are built once at deploy time.
- If ESPN's depth chart can't be fetched, the last published one stays rather than the tab going blank.

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

All three were found by a reader noticing a number looked wrong, which is the worst way to find them. So `scripts/verify-data.ts` now diffs the site against **nflverse's own season aggregation of the same games** — carries, yards, TDs, receptions, targets, fumbles per play type; every starting QB's completions, attempts, yards, TDs and INTs (also checked against Next Gen Stats, a second independent source); the defense board's sacks, QB hits, TFL, INT, pass breakups and forced fumbles; field-goal percentage; and the frozen 2025 QB line. It also checks every "see the plays" list against its number. An independently-produced aggregation is the only thing that catches this whole class. It found a fourth discrepancy within a minute of existing (kneels, which every official box score counts as carries).

The passing check was added after a fourth self-consistent error shipped: nflverse marks sacks as pass attempts, the site counted them, and Maye read 51/89 for 547 yards when the real line was 51/80 for 585. Every QB in the league was off. The same pass found the 2025 snapshot had folded in the playoffs (5,222 yards for a 4,394-yard season). All play-by-play is now filtered to the regular season at load.

It also asserts cross-file agreement: team EPA and success rate (value and rank) must match the league rankings file to 1e-9, Next Game's success rates must match the League table for both teams, each recap's success rate must be a whole number of its plays, position-group cards must match the league table, and no LB card may exist. If nflverse's stats file is missing it fails rather than passing having checked nothing. CI gates on it, and on the unit tests (`npm test`) covering the shrinkage, prior-blend taper, win probability, reliability gate, window construction, box-score rule, AI checks, stat-built recap bullets, Player of the Game crediting, the injury-report parser (on real reports) and the stat math.

---

## Recent fixes this session, if useful context

- **EPA opponent-adjustment bug**: a defense's "adjustment baseline" (what its opponents do in their other games) had no protection against small samples — a single fluky opponent game, common in Week 1-2, could get trusted at full face value. This is what let NE briefly show as the #1 pass offense in the NFL despite a negative raw EPA/play. Fixed by shrinking thin-sample baselines toward the league average, same statistical idea as regression-to-the-mean.
- **Recap archive**: used to silently overwrite itself down to just the most recent game. Now every completed game stays archived permanently.
- **Pass Protection grade** (formerly "OL"): was pure sack rate. Now uses sacks + QB hits, so a lineman who gets beaten but is bailed out by a quick throw doesn't get a free pass.

---

*Generated for personal reference — not part of the site's source.*
