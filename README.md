# The Foxboro Beacon

An advanced-analytics site for one NFL team, built to answer the questions a fan
actually argues about — is my team good, is my quarterback good, how do we compare
to the league, how's the secondary — in a form you can read at a glance rather than
a spreadsheet you have to interpret.

**Live:** [foxboro-files.vercel.app](https://foxboro-files.vercel.app)

Independent fan project, not affiliated with the NFL or any team. Stats from
[nflverse](https://github.com/nflverse/nflverse-data) (CC-BY 4.0), FTN charting data,
and public endpoints.

---

## What it does

Eight pages covering team strength, per-game recaps, the upcoming matchup, schedule,
roster and position grades, a quarterback deep dive, league-wide standings, and news.
Everything is graded as a **percentile against the other 31 teams**, because "−0.15
EPA/play" means nothing to most people and "26th in the league" means everything.

Three things drive most of the value:

**Opponent adjustment.** A unit isn't judged on raw production — it's compared against
what its opponents do in their *other* games. Shutting down a normally-explosive
offense counts for more than shutting down a team that's bad against everybody. This
is the same leave-one-out idea behind DVOA.

**Prior-season blending, phased out.** Through two games, pure current-season data is
too noisy to make forward-looking claims from, so predictive numbers blend real 2025
performance, tapering to zero by game four. Descriptive numbers never blend. Which is
which is documented per-page and labelled in the UI.

**Honesty about what the data can't do.** Free data cannot grade individual players
across a line or a secondary — that needs every snap charted, which is PFF's business
model. So the team-unit cards are named for what they measure (Pass Defense, Pass Rush,
Run Defense, Pass Protection) rather than for position groups they don't isolate.

---

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind v4
- **No database.** nflverse publishes each season's play-by-play as one complete,
  re-fetchable file, so the pipeline recomputes everything from source and commits flat
  JSON to `data/generated/`. Pages read static files; every stat window is precomputed
  at build time. Nothing to provision, nothing to migrate, and the full history of every
  number is in git.
- **Vercel** hosting, **GitHub Actions** for scheduled refreshes.

---

## How the data pipeline works

```bash
npm run build:data          # fetch → build everything → verify
npm run build:data:skip-ai  # same, without the AI narrative step
npm run verify:data         # check committed data without rebuilding
npm test                    # 108 unit tests
npm run calibrate:shrink 2025   # re-measure statistical constants off a finished season
```

`scripts/build-all.ts` orchestrates every build step off a single raw snapshot, so no
two outputs can be computed from different fetches. It hard-fails on the data steps and
fails soft on the AI step. Refreshes run on GitHub Actions: news every three hours, and
stats four times across the Sunday–Monday cycle plus daily, timed around when nflverse
finalizes play-by-play. A Sunday afternoon game is reflected on the site in about an
hour, including its generated recap.

### Verification is against an outside source, on purpose

Early on, three counting stats were wrong in a way no internal check could catch: the
site's numbers agreed with each other perfectly and didn't match football. A fumble on a
reception was attributed to nobody; fumbles *lost* were counted instead of fumbles; and
every QB scramble in the league was silently dropped, because nflverse leaves
`rusher_id` empty on those rows and only populates `rusher_player_id`.

`scripts/verify-data.ts` now diffs the generated leaderboards against **nflverse's own
independent aggregation of the same games**, alongside cross-file assertions (team EPA
must match the league rankings file to 1e-9; no fabricated position card may exist). CI
gates on it. It caught a fourth discrepancy within a minute of being written.

---

## A thing I'd point at

`scripts/lib/reliability.ts` exists because shrinkage wasn't enough.

Regressing every team toward the league mean stops one small-sample team from outranking
a well-measured one. It does not stop a ranking that is *entirely noise* — when the whole
league is small-sample, every team is pulled by roughly the same weight, the ordering
survives, and the table still looks authoritative.

Two games into the season, the receiver "hands" metric ranked New England 3rd in the
league. Testing it properly: the spread observed between teams was **smaller than random
chance alone produces** at those sample sizes — a reliability of 0.00. Flipping a single
drop moved them from 3rd to 16th. So the site withholds the rank and shows raw counts
until the metric earns one, with hysteresis on the threshold because replaying the
completed 2025 season showed a single cutoff made the rank blink on and off week to week.

The same tooling measures the shrinkage constants against a finished season instead of
leaving them as numbers picked by feel, and reports that RB and TE efficiency don't
stabilize even across a full year — which is why those two cards carry a visible caveat
rather than a confident grade.

---

## Documentation

- **[STATS-METHODOLOGY.md](STATS-METHODOLOGY.md)** — what every number means, which tier
  it belongs to, and where the estimates are estimates
- **[FEATURES-SUMMARY.md](FEATURES-SUMMARY.md)** — feature-by-feature breakdown
- **[PROJECT-SUMMARY.md](PROJECT-SUMMARY.md)** — architecture and decisions

## Running locally

```bash
npm install
npm run dev
```

The generated data in `data/generated/` is committed, so the site runs immediately
without fetching anything. To refresh from source, run `npm run build:data`.
