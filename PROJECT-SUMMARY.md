# The Foxboro Beacon — Project Summary

An analytics-driven New England Patriots fan site (foxboro-files.vercel.app), built entirely in Claude Code over an extended, multi-session collaboration. This doc captures the tech stack, architecture, data sources, AI usage, and the actual working methodology used to build it — for comparison against another Claude Code project.

Repo: `mikeenos14-tech/foxboro-files` · 91 commits as of this writing.

## What it is

A fan site pitched as analytically serious (EPA-based stats, opponent-adjusted rankings, win probability, playoff odds) but still fun and readable — not a spreadsheet. Original wordmark and navy/red/silver color palette, deliberately no official NFL/Patriots logos or shield graphics (trademark exposure). Seven sections: Home, Recap, Next Game, Schedule, News, Roster & Stats, Around the League (league-wide standings/power rankings/headlines).

## Tech stack

- **Next.js 16 (App Router)** + **React 19** + **TypeScript**
- **Tailwind CSS v4**, custom design tokens (navy `#0a1f44`, red `#d1102e`, silver) with full light/dark theme support via CSS custom properties
- **Recharts** for charts; **canvas-confetti** for a small "make the call" score-predictor game
- **Hosting: Vercel**, auto-deploys on every push to `main`
- **No database.** Data is flat, normalized JSON committed directly to the git repo under `data/generated/` — diffable, auditable, and trivially cheap for this write volume (a few refreshes a day). `lib/data/store.ts` is the single read abstraction every page goes through, with hand-written fixture fallbacks (`lib/data/fixtures.ts`) for anything not yet backed by real data.
- **Data pipeline: standalone TypeScript scripts** run via `tsx` (not a framework/ORM) — `scripts/fetch-*.ts` pull raw sources into `data/raw/` (gitignored), `scripts/build-*.ts` normalize them into the typed shapes in `lib/data/types.ts` and write `data/generated/*.json`.

## Data sources

| Source | What it provides | Character |
|---|---|---|
| **nflverse** (GitHub-hosted CSV releases) | Play-by-play, schedules, rosters, official weekly injury reports | Free, CC-BY 4.0, authoritative, but updates on nflverse's own release cadence — can lag a real-world event by a day |
| **ESPN's public undocumented endpoints** | News, live roster/injury status, scoreboard/odds | Free, keyless, no official docs — treated as fragile (schema-validated, fails soft) |
| **patriots.com RSS + article scraping** | Team news, and (built late in the project) the actual Wed/Thu/Fri practice-participation report | Free, official team source; the practice report is parsed out of a JSON-LD block embedded in the article HTML, not a documented API |
| **Pro Football Rumors / Pro Football Talk RSS** | League-wide transaction/injury/insider news, added to broaden the "Around the League" headlines pool | Free, keyless, verified by hand to be free of fantasy-football content |

Explicitly **not** used: Google News RSS (ToS restricts it to personal non-commercial feed readers, doesn't fit a site shared with friends/family), any paid data provider, any PFF+-style subscription requiring manual exports.

## AI integration (Claude API)

Model: `claude-haiku-4-5-20251001`, called through a thin wrapper (`scripts/lib/claude.ts`) with a `generateJson<T>` helper for structured output. Every AI call in the pipeline follows one hard rule: **selection/extraction from real, already-fetched facts only — never free generation.** Concretely:

- **Recap "The Take" / next-game "The Preview" / good-bad-ugly bullets / beat-writer digest** — written from real computed stats passed into the prompt, explicitly instructed never to invent a stat, play, or event.
- **Around the League headlines curation** — the model only selects which of a list of real, already-fetched headlines to keep (never rewrites them), instructed to act as a "world-class NFL editor," with fantasy-football content excluded as an absolute, non-negotiable rule that can't be traded off against hitting a target count.
- **Practice report extraction** — given the real article text, the model extracts real per-player facts (name, status) it's told never to invent; every returned player name is independently verified to appear verbatim in the source text before being trusted (defense against hallucination, not just a prompt instruction).
- Every AI step runs with `continue-on-error: true` in CI and fails soft — a missing API key or a bad response leaves the previous good output in place rather than breaking the build.

## Automation (GitHub Actions)

Two workflows, split by how often the underlying reality actually changes:

- **`refresh-stats.yml`** — runs once daily (~5am ET) plus two extra passes around the Sunday/Monday NFL slate, since real game stats only change when games are actually played. Pulls the full nflverse dataset (play-by-play, rosters, schedule), rebuilds team stats, league-wide EPA/standings, roster grades, opponent matchup data, and the AI recap/preview.
- **`refresh-headlines.yml`** — runs every 3 hours, all week, since news/injury reports/odds change continuously. Pulls ESPN + RSS sources, the patriots.com practice report, and runs the two curation-style AI steps.
- Both workflows: `continue-on-error: true` on every data step, then `git pull --rebase` before push to handle two automated workflows committing concurrently.

## Notable methodology / analytical decisions

- **Opponent-adjusted EPA** via a leave-one-out baseline: a team's game is adjusted against its opponent's average performance in their *other* games only, to avoid the two-teams-who-only-played-each-other collapsing each other's value to zero.
- **Predictive vs. descriptive framing, deliberately kept separate**: Team Strength cards, Next Game ranks, and win probability blend in real 2025 prior-season data (linearly taken to zero by 4 games played — originally 8 to match EPA-stabilization research, revised down because that research is about within-season sample stability, not how much a different season's roster should still count) because those are meant to be predictive. The Around the League power rankings are explicitly *not* blended — pure current-season EPA only, because that section is framed as "who's been best this year," not a forecast.
- **Small-sample-size honesty**: when several unrelated stats coincidentally landed on the exact same league rank early in the season, the answer was to actually compute and verify the real numbers (no shared raw values, no tie-breaking bug) rather than assume a bug — it's a real, explainable small-n artifact, and that's what got reported back.

## Design conventions

- A handful of shared primitives (`StatCard`, `RankBadge`, `SoWhatNote`, `TeamLogo`, `PlayerHeadshot`) reused everywhere a "value + vs.-league context + one-line takeaway" pattern shows up, so new stat surfaces (QB comparison, position-group grades) inherit the same visual language instead of inventing new ones.
- Full light/dark theme via CSS custom properties on `:root`, redefined under both `prefers-color-scheme` and an explicit `[data-theme]` override.
- Mobile-first: every new section gets checked at a phone-width viewport before shipping, not just desktop.

## How this was actually built (working methodology)

- **Iterative, feature-by-feature, in conversation** — no big upfront spec beyond an initial phase plan; most features (Around the League, QB head-to-head, the practice-report pipeline) were designed in a short back-and-forth (propose approach → user picks/adjusts → build) rather than fully speced in advance.
- **Research before recommending**: before proposing a new data source, actually `curl` it, check response shape, verify it's not fantasy-contaminated or dead — two proposed sources (NFL.com RSS, Reddit JSON) were confirmed dead/blocked and dropped rather than guessed at.
- **Local test / real-workflow test split**: pure data-transform code gets tested locally against real cached data before shipping. Anything needing the real `ANTHROPIC_API_KEY` (not available locally) gets pushed, the user triggers the real GitHub Actions workflow, and the actual committed output gets pulled and inspected — this project never shipped an AI-dependent change without seeing its real output at least once.
- **Visual verification via a real browser** before calling any UI change done — light mode, dark mode, and a phone-width viewport, on the actual deployed site, not just "should work."
- **Root-cause debugging over guessing**: when a real bug resisted local reproduction (the injury-report merge silently doing nothing in CI), the approach was to add temporary, committed diagnostic output rather than keep guessing — which led to finding the actual cause (a workflow that intentionally never fetches one CSV file the merge code depended on) instead of settling for a plausible-sounding but wrong theory.
- **Small, honest commits** — one focused change per commit, commit messages that explain *why* (often citing what was tried and ruled out), never bundling an unrelated fix into an in-progress feature commit.
