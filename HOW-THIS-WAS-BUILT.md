# How This Was Built — A Plain-English Walkthrough

Written for someone who doesn't code. No jargon that isn't explained. The goal is
that you understand what the pieces are, why each one is there, and — the part that
actually makes you better at this — how to tell when something is quietly wrong.

---

## 1. The big idea

Most websites work like a restaurant: you order, the kitchen cooks it fresh, you wait.

This site works like a vending machine. Everything is **cooked in advance** and sitting
on the shelf. When you open the page, it just hands you what's already there.

That's the single decision that shapes the whole project. There are two halves:

**The kitchen** — a set of programs that run on a schedule. They download NFL data,
do all the math, and save the answers as plain files.

**The storefront** — the website. It does almost no thinking. It reads those files and
draws them nicely.

Because of that split, the site is fast, cheap to run, and — importantly — every number
on it was calculated once, in one place, where it can be checked.

---

## 2. The tools, and what each one is actually for

There are 17 outside tools in this project. That's a deliberately small number. Each
one is here because it does a specific job.

### The language

**TypeScript** — the language everything is written in.

It's JavaScript (the language of the web) with one addition: you label what kind of
thing every value is. "This is a number." "This is a list of players." Sounds tedious;
it's the single biggest error-catcher in the project.

> **Why it matters to you:** when we renamed four stats today, TypeScript immediately
> listed all 32 places that mentioned the old names. Without it, we'd have found them
> by clicking around and hoping. It turns "did I miss anything?" into a list.

### The website

**Next.js** — the framework the site is built on. Think of it as the building: it
handles the addresses (`/roster`, `/schedule`), page loading, and the previews that
show up when you paste a link into LinkedIn.

**React** — how pages are built out of reusable pieces. A "position group card" is
written once, then used eight times with different numbers. Change it once, all eight
update.

**Tailwind CSS** — how things are styled. Instead of a separate file describing what
everything should look like, the styling sits right on the thing itself. `text-sm`
means small text. `rounded-lg` means rounded corners. It reads like labels, and you
never have to hunt through a style file to find what's making something blue.

**Recharts** — draws the charts, like the win-probability line on recap pages.

### Reading the raw data

**csv-parse** — NFL data arrives as spreadsheets (CSV files). This turns a spreadsheet
into something the code can work with.

**fast-xml-parser** — news feeds arrive in a format called XML. Same idea.

**canvas-confetti** — confetti animation. Not every tool has to be serious.

### The workshop tools

**tsx** — lets us run a single program on demand, like running one recipe instead of
opening the whole restaurant. Every `npm run something` command uses it.

**ESLint** — flags sloppy code. Unused leftovers, common mistakes. It caught two dead
variables today after we rewrote things.

**node:test** — runs the tests (more on those below). Notably this is *built into*
the thing that runs our code, so it added nothing to install.

> **A habit worth stealing:** every tool added is a thing that can break, go out of
> date, or need updating later. Seven runtime tools for a 14,000-line app is lean.
> When an AI suggests installing a library, it's fair to ask: "can we do this without
> adding anything?" Often yes.

---

## 3. The decision that mattered most: no database

A database is the normal answer for "where do the numbers live." We didn't use one.

The reason is specific: the NFL data source publishes **the entire season as one
complete file**, refreshed constantly. We don't need to ask it questions — we can just
take the whole thing and do the math ourselves.

So instead of a database, the answers are saved as 29 plain text files in a folder.

What that bought us:

- **Nothing to run or pay for.** No database to set up, back up, or keep alive.
- **A complete history.** Every version of every number is saved forever, with a note
  saying what changed and why. When a number looks wrong, we can see exactly when it
  changed.
- **It works offline.** You can clone this project and run it with no setup at all,
  because the answers are already in it.

> **The transferable lesson:** "what everyone normally does" and "what this specific
> project needs" aren't always the same. It's worth asking *why* a standard piece is
> standard before accepting it. Sometimes the answer is "it isn't needed here."

---

## 4. How a number gets to the screen

Five steps, every time:

**1. Fetch** — download the raw data. Play-by-play for every NFL game, rosters,
injuries, charting data, news feeds.

**2. Build** — do the math. Rank all 32 teams, adjust for opponent strength, compute
grades. This writes the 29 answer files.

**3. Verify** — check the answers before trusting them. (Section 6 — this is the
important one.)

**4. Commit** — save the new files with a note describing what changed.

**5. Deploy** — the site rebuilds itself automatically with the new numbers.

One command does 1 through 3:

```bash
npm run build:data
```

Crucially, all the steps run off **one single download**. An earlier version let
different steps fetch at different moments, and the site ended up showing a stat as
20th on one page and 7th on another — because they'd been computed from two different
snapshots. One fetch, one set of answers.

---

## 5. The robots: Git, GitHub, Actions, Vercel

Four names that get used interchangeably but do different jobs:

**Git** — a save system with memory. Every save ("commit") has a message explaining
the change. You can go back to any point.

**GitHub** — where those saves live online. The backup and the shareable copy.

**GitHub Actions** — a robot that runs chores on a timer. Ours does two:
- Every 3 hours: refresh news and injuries
- Four times across Sunday and Monday: refresh all stats, timed around when the NFL
  data actually finalizes

The robot runs the same `npm run build:data` you'd run by hand, and — this part
matters — **it only saves if the checks pass.** If verification fails, nothing ships.

**Vercel** — hosting. It watches GitHub, and when something changes, it rebuilds the
site. That's why a Sunday afternoon game shows up on the site about an hour later
without anyone touching anything.

---

## 6. The part that actually keeps it honest

This is the section to remember.

### Tests: 108 small "does this still work?" checks

A test is a question with a known answer. "If a receiver catches 2 of 3 catchable
balls, is the rate 67%?" Run all 108 in under a second. If a change breaks something
elsewhere, they say so immediately.

They earned their keep today. When we renamed four stats, tests failed instantly and
pointed at exactly what still used the old names.

### The verifier: checking against the outside world

Here's the thing that took three real bugs to learn.

All our checks compared **our numbers to our other numbers**. And they all passed —
perfectly. The data was flawlessly consistent with itself and **did not match
football**:

- A running back fumbled on a *catch*. We only looked for fumbles on runs. It
  vanished.
- We counted fumbles *lost*, not fumbles. One that bounced out of bounds vanished too.
- Every quarterback scramble in the league was dropped — 141 plays — because the data
  source leaves one field blank on those and fills a different one. Drake Maye's
  rushing line said **1 carry for 3 yards**. It was really **11 for 64**.

None of those were catchable by internal consistency. Being consistent with yourself
proves nothing if you're consistently wrong.

The fix: the verifier now compares our leaderboards against **the data source's own
version of the same numbers** — an independently produced answer to the same question.
It found a fourth problem within a minute of being written.

> **The lesson, and it generalizes far beyond code:** "my numbers agree with each
> other" is not evidence. "My numbers agree with someone else's, calculated
> differently" is.

---

## 7. What this teaches about working with AI

The honest part. Here's what actually went well and badly today.

### Your instincts caught things the AI didn't

Twice today you said a version of *"that doesn't look right"* — about receivers
ranking 3rd in the league, and about a missing fumble. Both times you were right, and
both times it exposed something real. The fumble question uncovered **three** bugs, one
neither of us knew about.

You don't need to read code to do that. You need to know the subject. **Domain
knowledge is a debugging tool**, and it's the one you already have.

### Ask what a number *means*, not just whether it's right

"Our receivers are 3rd in the league" was technically computed correctly. It was still
nonsense — it came from 21 catches, and one dropped pass would have moved them to
16th. The math was fine; the *claim* was not.

Good questions to keep asking:
- "How much data is that based on?"
- "What would have to change for this number to move a lot?"
- "Does this agree with what I see watching the games?"

### Beware of things that grow quietly

The recent-form filter was built to offer every window: last 1 game, last 2, last 3…
Fine in Week 2 with two options. By Week 17 it would have been **nineteen**, including
"Last 13 Games," which nobody wants. Nothing was broken — it just would have gotten
worse every week, invisibly.

**Worth asking on anything that involves time or growth: "what does this look like in
three months?"**

### Names are not cosmetic

Four cards used to say OL, Edge, Interior DL, Secondary. They didn't measure those
things — they measured whole-team pass protection, pass rush, run defense and pass
defense. "Secondary: 94" read as "our defensive backs are elite" when it meant "our
pass defense has been good," and a chunk of that was the pass rush the *other* card was
already taking credit for.

Renaming them changed no math at all and made the site substantially more honest. **If
a label overpromises, that's a real bug**, not a nitpick.

### Ask for the evidence, not the conclusion

The most useful thing you did all session was refuse to accept a claim and ask for the
check. The receiver number survived one round of "trust me" and died the moment it was
actually measured.

AI is confident by default, including when it's wrong. "Can you verify that against
the real data?" is close to a superpower. So is "show me what that looks like in ten
weeks."

### Simple beats clever

There was a point today where the statistics were getting more elaborate than the
project needed, and you said so. That was the right call. The site's job is to answer
"is my team good" at a glance — not to be a research paper.

**"Are we overbuilding this?" is a question worth asking out loud, often.** The answer
is sometimes yes, and an AI will rarely volunteer it.

---

## 8. The short version

| | |
|---|---|
| **Language** | TypeScript — labels everything so mistakes get caught early |
| **Website** | Next.js + React — pages built from reusable pieces |
| **Styling** | Tailwind — styles written right on the thing |
| **Data storage** | Plain files, no database — because the source gives us everything |
| **Automation** | GitHub Actions — a robot on a schedule |
| **Hosting** | Vercel — rebuilds automatically when data changes |
| **Safety net** | 108 tests + a verifier that checks against an outside source |
| **Size** | ~14,000 lines, 131 files, 7 runtime dependencies |

And the five habits worth carrying to the next project:

1. **Trust your gut when a number looks wrong.** You were right both times today.
2. **Consistent isn't correct.** Always ask what outside source agrees.
3. **Ask what a number means**, not just whether it computed.
4. **Ask what it looks like in three months.**
5. **Ask if you're overbuilding.** Regularly.
