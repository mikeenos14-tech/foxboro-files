# The Foxboro Beacon — Features & Stats Summary

A page-by-page rundown of what's actually live on the site (foxboro-files.vercel.app) as of this writing.

## Home

- Team identity header: record, division rank, playoff odds (with a probability bar), then two full-width strips: Next Up (opponent, day, kickoff time, TV network, countdown, line) and the last result with a link to its recap.
- One-sentence season-snapshot banner (record, streak, point differential).
- Team Strength vs. League: point differential, offensive/defensive EPA/play (opponent-adjusted), success rate and yards/play — all ranked, with a Last Game / 2025 Season filter.
- Week by Week chart: offense EPA/play gained and defense allowed in every game, with a game-by-game table underneath — "are we getting better?" Tap a point to open that game's recap.
- Unit grade chips — each opens that unit's ranking across all 32 teams.
- AFC East division standings table.
- Latest headlines feed.

## Recap (index + per-game detail)

- Index: every game this season as a card — score, opponent, one-line summary.
- Detail page:
  - Real box score.
  - AI-written "The Take" — grounded fan-voice recap.
  - "What Stood Out" — up to three genuinely rare things from the game (a top-10% team or QB game league-wide this season, a 100-yard game ranked against every player-game, a comeback by win probability, "most points since…", "first win over X since…", a streak), each computed in code with its comparison population shown; absent after an ordinary game.
  - Win-probability chart across the full game.
  - Advanced Stats: EPA/play, success rate for/against vs. the league average, turnover margin, explosive-play rate, red zone and 3rd-down splits (offense and defense).
  - Player of the Game — New England's leader in win probability added, crediting passers, receivers, runners, defenders, kickers and returners.
  - Good/Bad/Ugly breakdown, built from the stats against league norms.
  - AI-written "Take" (checked in code before it's published), with a "Flag it" link.
  - Tap turnovers, explosive plays, red zone, third downs or Player of the Game to see the plays behind the number.

## Next Game

- Matchup hero: live countdown, weather, spread.
- Tabbed:
  - **Preview** — AI-written preview take, Tale of the Tape (each offense vs. the defense it faces: EPA rank and success rate), Matchup of the Week callout.
  - **Matchups** — 5 position-group grades (pass/rush offense vs. defense, pass protection vs. rush), opponent-adjusted and blended with real 2025 prior-season data; recent form; head-to-head history.
  - **Injuries** — both teams side by side: the official report once it's out (with patriots.com's same-day practice status, parsed in code), otherwise only designations made since each team's last game — never last week's list or healthy scratches.

## Schedule

- Full season table with a remaining-schedule snapshot banner.
- Opponent record, opponent EPA rank, result/win chance per game; fits a phone without sideways scrolling.

## News

- AI-written beat-writer digest, with a "Flag it" link.
- Injury report.
- Merged news feed (ESPN + the Patriots' own RSS feed). Cards are title first, then tag · date · source; Home shows the same cards without summaries.

## Stats (the Roster page, `/roster`)

Tabbed, with the open tab kept in the URL so links and the back button land on it. Tab bars across the site take left/right arrow keys:
- **QB** — official box score (matches nflverse and Next Gen Stats exactly), CPOE, turnover-worthy rate, EPA when hit or sacked vs. not, accuracy by depth, ranked against the other 31 starting QBs, plus Next Gen Stats time to throw and tight-window throws; head-to-head comparison tool against any other starter.
- **Leaders** — receiving, rushing and defensive leaders, with Next Gen Stats separation and rush yards over expected; tap a player to see every play behind his line.
- **Grades** — 8 units graded out of 100 vs. the league with a visual bar and trend arrow, each showing its real box-score stat line and flagging thin samples; each links to all 32 teams' ranking.
- **Splits** — situational splits, kicking/return stats and penalties; red zone, third downs, the two-minute drill, field goals and penalties each open the season's plays.
- **Depth Chart** — the team's own, via ESPN, by offense, defense and special teams.

## Around the League

- **Every Team, Ranked** — all 32 teams ranked on the whole offense or defense (opponent-adjusted EPA plus success rate) or on any of the eight unit grades, New England highlighted; one tap from Home's grade chips.
- Last week's final scores across the whole league.
- Division standings, AFC and NFC as tabs.
- AI-curated top league headlines — real trades/injuries/storylines from ESPN + Pro Football Rumors + Pro Football Talk, fantasy content filtered out.

## Methodology (what makes these "stats," not just numbers)

- Team-level vs.-league numbers are **opponent-adjusted** — a defense gets more credit for shutting down a good offense than a bad one. Position-group and QB numbers are not opponent-adjusted, but are **regressed to the league mean by sample size**.
- Win-probability and matchup numbers **blend in real 2025 prior-season data**, phased out linearly by 4 games played. Team Strength and the league rankings are pure current-season.
- Every AI-written passage is **grounded** — written only from real computed stats and real fetched articles, never free-generated.

## Installed as an app

- A web-app manifest and iOS home-screen settings, so the site opens full-screen from a phone's home screen.
- A resumed app (or a tab left open) reloads itself when it comes back into view after more than 15 minutes away, so the numbers are current.
- A "Skip to content" link for keyboard users; text colors meet contrast guidelines in both themes.
