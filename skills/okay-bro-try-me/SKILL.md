---
name: okay-bro-try-me
description: "Weekly learning game built from what you and the agent did this week. A script digests the week's sessions (prompts, errors, closing notes, new memory notes); the agent picks the 2-4 lessons that cost the most time or changed a decision (a wrong port found after hours, an architecture detail that broke in practice, a misread email) and writes only a small levels JSON. A template turns it into a Duolingo-style path: units, hearts, XP, combos, missed questions recycled, multiple choice first, then fill-in, ordering, free writing and an in-page code editor that runs locally. Difficulty follows last week's accuracy; misses come back as review next week. Works for any kind of task, not only code. Suggests running once a week as a scheduled task. Use for /okay-bro-try-me, or when the user asks to review, quiz or gamify what was learned this week (这周学到了什么, 出题考我, 周复盘小游戏). Not for code review (okay-review) or skill retros (okay-reflect)."
license: MIT
---

# okay-bro-try-me

Turn this week's lessons into a short, fun game the user plays in the browser. Cheap by design: scripts do the fixed parts, you write one JSON file.

**Never read** `game.html`, `scripts/*.js` or raw transcripts. Run the scripts; read only their output. All commands run from this skill's folder.

## 1. Digest the week

```bash
node scripts/week.js --days 7
```

It prints, per session: the user's prompts, tool errors, the closing text; memory notes written this week; then a `# player` line (`first run`, `prefs`, `suggested level`, queued review items). That output is your only source.

## 2. First run only

When the player line says `first run: true`, ask once, both questions in one AskUserQuestion:

1. Format: **Duolingo-style levels in the browser** (default) / quick quiz right here in chat (no browser, fewest tokens) / something else they describe.
2. Make it weekly: **yes, a local scheduled task** (default) / no, I'll call it.

Save the answers: `node scripts/play.js prefs '{"format":"levels","weekly":true}'`.

Weekly: create a local weekly task that runs `/okay-bro-try-me` (the desktop app's scheduled tasks, else the OS scheduler running `claude -p "/okay-bro-try-me"`). Not a cloud routine: it cannot read local sessions. A scheduled run stops after step 4 `build` and notifies the user with the `serve` command.

Later runs follow `prefs` without asking.

## 3. Pick the lessons

Pick 2-4 moments from the digest, best first:

- it cost real time (a long hunt, a retry loop, the same error three times);
- it surprised us (the cause was somewhere nobody looked);
- it changed a decision (a design detail that was wrong once built).

Each becomes one unit. `concept` is the takeaway as a short rule ("Check the address before the code"), not the topic. `story` retells the real scene in 1-2 sentences so the user recognizes it. Not every unit is about code: a mis-scoped email, a spreadsheet formula, a travel booking all count. Nothing good this week? Say so in one line and stop; a thin week gets no game.

Never put secrets, tokens, private names, customer or company details in a question. Paraphrase.

## 4. Write the levels

Write `levels.json` in a temp or scratch folder. Schema (all text in the user's language):

```json
{"title": "Week 45: ...", "level": 2, "intro": "one line",
 "units": [{"concept": "...", "story": "...", "items": [ITEM, ...]}]}
```

| `t` | Fields | Skill it trains |
|---|---|---|
| `mc` | `q`, `opts` (3-4), `a` (index) | recognize |
| `fill` | `q` with `___`, `a` (list of accepted answers) | recall |
| `order` | `q`, `steps` (correct order, shuffled for the player) | process |
| `write` | `q`, `rubric` (2-3 points), `model` | explain, self-graded |
| `code` | `q`, `lang` (`js` or `python`), `start`, `expect` (stdout), `solution` | do it |

Every item has `why`: one or two sentences that teach the concept, not just the fact.

Level from `suggested level` (or prefs). Per unit, 2-5 items, easy to hard:

| Level | Items |
|---|---|
| 1 | `mc` only, obvious distractors |
| 2 | `mc`, then `fill` |
| 3 | `mc`, `fill`, `order` |
| 4 | add `write`, or `code` when the lesson was code and the user writes code |
| 5 | fewer `mc`; distractors are what we actually tried first |

Make it fun: real scene, distractors that are plausible because we believed them this week, at most one joke per unit. `example-levels.json` shows the shape; read it only if unsure.

Format `chat quiz`: skip the files; ask the `mc` items here one at a time and give the `why` after each answer.

## 5. Build and play

```bash
node scripts/play.js build <levels.json>
node scripts/play.js serve
```

`build` appends up to 3 review items from last week's misses and writes `~/.okay/try-me/<date>.html` (`OKAY_HOME` overrides `~/.okay`). Run `serve` in the background: it binds 127.0.0.1, opens the browser, runs `code` items locally (5 s timeout), saves accuracy, XP, week streak and misses to `profile.json`, and exits after 2 hours idle.

No Node (claude.ai): paste the levels JSON over `/*LEVELS*/null` in `game.html` and show it as an artifact; code items then fall back to show solution.

## 6. Report

One line in the user's language: the URL, the unit concepts, the level. Nothing else. No reflect step: shared/delivery.md's reflect rule covers dev tasks that deliver code; this skill delivers none.
