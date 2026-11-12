# AGENTS.md

How to work in `okay-skills`: a Claude Code plugin (and marketplace) holding the `okay-*` development skill pack.

Tracker: github

## Layout

| Path | Holds |
|---|---|
| `.claude-plugin/plugin.json` | Plugin manifest. Plugin root is the repo root. |
| `.claude-plugin/marketplace.json` | Marketplace with one plugin, source `./` |
| `skills/<name>/` | One folder per skill. Auto-discovered; never list skills by hand. |
| `shared/` | Single source of rules shared by every okay-* skill |
| `scripts/build.js` | Copies into each `skills/okay-*/shared/` only the `shared/` files that skill references, plus the files those link to |
| `scripts/eval-rates.js` | Runs the evals through `claude plugin eval` and checks rates against `eval-targets.json` |
| `eval-targets.json` | Per-skill eval rate targets: a `default` set, overrides under `skills` |
| `hooks/` | Plugin hooks (auto-discovered `hooks/hooks.json`), see Hooks |
| `tests/` | `node:test` suites |

Every okay-* skill folder holds:

- `SKILL.md`: frontmatter keys only from `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. `name` equals the folder name. `license: MIT` is required. `description` at most 1024 chars. `description` contains no `<` or `>` (claude.ai rejects them as XML tags).
- `evals.json`: an array of `{id, kind, description, prompt, expectations}` with `kind` one of `positive`, `negative`, `behavioural`; at least 3 positive, 2 negative, 1 behavioural.
- `NOTICE.md` (optional): credits for borrowed material. Attribution goes here, per skill.
- `shared/`: generated. Never edit it by hand.

A skill references shared rules only as `shared/<file>.md`, relative to its own folder, and never links outside its folder. Each skill must work when uploaded alone to claude.ai.

## Build and test

1. After any change in `shared/`, run `npm run build` and commit the generated copies.
2. Run `npm test` before every commit. It fails when a copy drifts, a frontmatter key is outside the allowed six, a link escapes a skill folder, or evals fall below the minimums.
3. Validate the plugin with `claude plugin validate .`.
4. CI (`.github/workflows/test.yml`) runs `npm test` and `npm run package` on every PR and on pushes to main.
5. Measure a skill with `npm run eval -- --skill <name>` (all skills without `--skill`). It writes one `claude plugin eval` case per `evals.json` entry to `eval-cases/` (ignored by git), runs them with the plugin loaded, and prints per skill: positive trigger rate, negative false-trigger rate, behavioural pass rate, each against `eval-targets.json` (defaults: at least 90%, at most 5%, at least 80%). Exit 1 means a target was missed. Positive and negative cases pass on whether the Skill tool loaded that skill; behavioural cases are judged by an LLM grader against the expectations. Runs that error are left out of the rate and counted.
   - Needs: Claude Code with `claude plugin eval`, logged in or `ANTHROPIC_API_KEY` set. Every run is a full `claude` session on that credential and costs money (3 runs per case by default; pass `--runs 1` and `--max-cost-usd <usd>` to bound it). The first run asks to trust the plugin; `--trust-plugin` answers it.
   - Other flags go to `claude plugin eval` as given. `--results <file>` checks an earlier `--json` result without running anything; `--cases-only` only writes the cases.
   - Not in CI: it needs a paid credential as a secret. The rate math is unit-tested in `tests/eval-rates.test.js`.

## Hooks

`hooks/hooks.json` runs `hooks/reflect.js` on Stop, SessionEnd and SessionStart; it dispatches on `hook_event_name`.

- Stop: blocks once with "run okay-reflect" while `<git dir>/okay-reflect-pending` exists (the marker from `shared/delivery.md`); never when `stop_hook_active` is true.
- SessionEnd: moves a still-pending marker into `~/.okay/reflect-queue.jsonl` (`OKAY_HOME` overrides `~/.okay`).
- SessionStart: adds one context block with, in order, local memory and the reflect-queue message; either part is left out when empty, and with both empty it prints nothing. The queue part gives the count and offers okay-reflect, which removes the entries it handles. The memory part is a frozen snapshot of `$OKAY_HOME/memory/USER.md` and the current repo's `projects/<slug>.md`, threat-filtered, cut to the caps (1,500 and 2,500 chars) and labelled as possibly stale; outside git only `USER.md`. `OKAY_MEMORY=off` turns it off. Store, caps and CLI: `shared/memory.md`.

The memory CLI is `skills/okay-reflect/memory.js` (Node, no dependencies, shipped in the skill so it works when uploaded alone). Its threat-scan list is the only one: the hook requires it. Hook scripts are Node with no dependencies, exit 0 and print nothing when there is nothing to do or anything fails, and work outside git repos. If the marker format in `shared/delivery.md` changes, update `hooks/reflect.js` and `tests/hooks.test.js` in the same PR.

## Commits and PRs

- Commit messages: one line, no body, no trailers, `type: subject`.
- PR title `type: subject` (max 70 chars). PR body in English, max 300 words, sections Problem / Cause / Change / Evidence / Not touched / Risks, last line `Closes #<n>`.
- No AI attribution anywhere.
- Only ticket #10 edits `README.md`.

## Worktrees

Follow the Worktrees rule in `shared/git.md`: reuse an existing worktree folder in the root, else create `.worktrees/<branch>` (ignored by git). Work only inside your own worktree.

## Content rules

- This repo is public: no detail from private or company repos in any skill, example, or eval.
- Docs, code, and commits are in English.
