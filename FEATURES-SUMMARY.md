# The Foxboro Beacon — Features & Stats Summary

A page-by-page rundown of what's actually live on the site (foxboro-files.vercel.app) as of this writing.

## Home

- Team identity header: record, division rank, playoff odds (with a probability bar), last/next game mini-cards.
- One-sentence season-snapshot banner (record, streak, point differential).
- Team Strength vs. League: point differential, offensive/defensive EPA/play — all ranked and opponent-adjusted.
- AFC East division standings table.
- Latest headlines feed.

## Recap (index + per-game detail)

- Index: every game this season as a card — score, opponent, one-line summary.
- Detail page:
  - Real box score.
  - AI-written "The Take" — grounded fan-voice recap.
  - Win-probability chart across the full game.
  - Advanced Stats: EPA/play, turnover margin, explosive-play rate, red zone and 3rd-down splits (offense and defense).
  - Player of the Game (by win probability added).
  - Good/Bad/Ugly breakdown.

## Next Game

- Matchup hero: live countdown, weather, spread.
- "Make the Call" score predictor.
- Tabbed:
  - **Preview** — AI-written preview take, opponent offensive/defensive EPA rank, Matchup of the Week callout.
  - **Matchups** — 5 position-group grades (pass/rush offense vs. defense, pass protection vs. rush), opponent-adjusted and blended with real 2025 prior-season data; recent form; head-to-head history.
  - **Injuries** — both teams side by side, real Wed/Thu/Fri practice-participation status sourced directly from patriots.com.

## Schedule

- Full season table with a remaining-schedule snapshot banner.
- Opponent record, opponent EPA rank, opponent's own strength of schedule, result/win probability per game.

## News

- AI-written beat-writer digest.
- Injury report.
- Merged news feed (ESPN + the Patriots' own RSS feed).

## Roster & Stats

Tabbed:
- **QB** — CPOE, turnover-worthy rate, pressure/clean-pocket EPA, accuracy by depth, all ranked against the other 31 starting QBs; head-to-head comparison tool against any other starter.
- **Position Grades** — 8 position groups, percentile-graded vs. the league with a visual bar, each showing its real box-score stat line and flagging thin samples.
- **Splits & Special Teams** — situational splits, kicking/return stats.
- **Depth Chart**.

## Around the League

- League-wide power rankings — current-season-only, opponent-adjusted EPA (offense and defense).
- Last week's final scores across the whole league.
- All 8 division standings.
- AI-curated top league headlines — real trades/injuries/storylines from ESPN + Pro Football Rumors + Pro Football Talk, fantasy content filtered out.

## Methodology (what makes these "stats," not just numbers)

- Team-level vs.-league numbers are **opponent-adjusted** — a defense gets more credit for shutting down a good offense than a bad one. Position-group and QB numbers are not opponent-adjusted, but are **regressed to the league mean by sample size**.
- Win-probability and matchup numbers **blend in real 2025 prior-season data**, phased out linearly by 4 games played. Team Strength and the league power rankings are pure current-season.
- Every AI-written passage is **grounded** — written only from real computed stats and real fetched articles, never free-generated.
