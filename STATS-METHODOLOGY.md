# The Foxboro Beacon — Stats & Methodology Breakdown

A plain-English guide to what's on the site, where the numbers come from, and — the thing that actually matters for trusting them — **which numbers are "pure this season" and which are blended with last year's data.**

---

## The three-tier weighting system

Every stat on the site falls into one of three tiers. This is the single most important thing to understand about how the site works.

**Tier 1 — Opponent-adjusted + blended with 2025 (predictive numbers).**
Used where the site is making a forward-looking claim ("who's going to win," "how tough is this matchup"). Early in the season, 1-2 games of pure current-season data is too noisy to trust on its own, so these numbers blend in real 2025 performance, linearly phased out to zero by game 4 (by Week 5, it's 100% current season, no 2025 left in the number). Where: **win probability, playoff odds, Schedule's "Opp EPA Rank," Next Game's "Opponent EPA Rank," and the Matchups tab's 5 position-group grades.**

**Tier 2 — Opponent-adjusted, current-season only, NOT blended (descriptive numbers).**
Used where the site is describing "how good has this team actually been this year" — deliberately not diluted with 2025 data, even though that means more noise early in the season. Where: **Home page's Team Strength EPA cards, Around the League's power rankings.**

**Tier 3 — Not opponent-adjusted, not blended, but regressed to the league mean (position/player-level numbers).**
Used for QB Deep Dive and Position Grades. No opponent-of-opponent math and no prior-season blend — but every per-play value IS shrunk toward the plays-weighted league mean by sample size before ranking (see `scripts/lib/shrink.ts`), because these run on far thinner samples than team-level stats. A TE grade can come off 10 targets; without shrinkage that's noise rendered as precision. Cards built on thin samples say so explicitly in the UI. Still doesn't correct for a unit having faced an unusually strong or weak set of opponents.

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

| Group | What it measures | Adjusted? | Real per-player data? |
|---|---|---|---|
| QB | EPA/play, cleanly attributed via `passer_id` | No | Yes |
| RB | EPA/play, via `rusher_id` | No | Yes |
| WR / TE | EPA/play, via `receiver_id` | No | Yes |
| OL | Blends two signals: sacks allowed that weren't the QB's own fault (real FTN charting data), and pressure rate allowed (sacks + QB hits) | No | No — team-wide, no free per-lineman blocking data exists |
| Edge | Sack rate generated | No | Team-wide only *(see note below — real per-player data exists but isn't wired in yet)* |
| Interior DL | Rush EPA allowed | No | Same as above |
| Secondary | Pass EPA allowed | No | Same as above |

**Note on the defensive front/secondary:** the *grades* are still team-wide proxies, but each card now also shows real per-player sack, QB hit, tackle-for-loss, forced-fumble, interception and pass-defensed totals with a named leader, pulled from nflverse's own player-attribution columns.

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

## The "last N games" filter — how it works and why no database

Three places have it: QB Deep Dive, Team Strength, Position Grades. Every possible window (1 game back, 2 games back, ... up to however many games have been played) is precomputed at build time, not queried live — nflverse hosts each season's play-by-play as one complete, re-fetchable file, so there's no need for a database to slice it arbitrarily. QB and Position Grades windows are simple raw slices (no cross-team math involved). Team Strength's windows are calendar-week-based rather than per-team-game-count, specifically so the real opponent-adjustment math stays valid across teams with different bye weeks — full explanation is in the code comments if you ever want the details (`scripts/lib/statWindows.ts`).

## Recent fixes this session, if useful context

- **EPA opponent-adjustment bug**: a defense's "adjustment baseline" (what its opponents do in their other games) had no protection against small samples — a single fluky opponent game, common in Week 1-2, could get trusted at full face value. This is what let NE briefly show as the #1 pass offense in the NFL despite a negative raw EPA/play. Fixed by shrinking thin-sample baselines toward the league average, same statistical idea as regression-to-the-mean.
- **Recap archive**: used to silently overwrite itself down to just the most recent game. Now every completed game stays archived permanently.
- **OL grade**: was pure sack rate. Now blends in a real pressure-rate signal (sacks + QB hits) so a lineman who gets beaten but is bailed out by a quick throw doesn't get a free pass.

---

*Generated for personal reference — not part of the site's source.*
