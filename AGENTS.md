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
| `scripts/build.js` | Copies `shared/*` into every `skills/okay-*/shared/` |
| `hooks/` | Plugin hooks (auto-discovered `hooks/hooks.json`), see Hooks |
| `tests/` | `node:test` suites |

Every okay-* skill folder holds:

- `SKILL.md`: frontmatter keys only from `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. `name` equals the folder name. `license: MIT` is required. `description` at most 1024 chars.
- `evals.json`: an array of `{id, kind, description, prompt, expectations}` with `kind` one of `positive`, `negative`, `behavioural`; at least 3 positive, 2 negative, 1 behavioural.
- `NOTICE.md` (optional): credits for borrowed material. Attribution goes here, per skill.
- `shared/`: generated. Never edit it by hand.

A skill references shared rules only as `shared/<file>.md`, relative to its own folder, and never links outside its folder. Each skill must work when uploaded alone to claude.ai.

## Build and test

1. After any change in `shared/`, run `npm run build` and commit the generated copies.
2. Run `npm test` before every commit. It fails when a copy drifts, a frontmatter key is outside the allowed six, a link escapes a skill folder, or evals fall below the minimums.
3. Validate the plugin with `claude plugin validate .`.
4. CI (`.github/workflows/test.yml`) runs `npm test` and `npm run package` on every PR and on pushes to main.

## Hooks

`hooks/hooks.json` runs `hooks/reflect.js` on Stop, SessionEnd and SessionStart; it dispatches on `hook_event_name`.

- Stop: blocks once with "run okay-reflect" while `<git dir>/okay-reflect-pending` exists (the marker from `shared/delivery.md`); never when `stop_hook_active` is true.
- SessionEnd: moves a still-pending marker into `~/.okay/reflect-queue.jsonl` (`OKAY_HOME` overrides `~/.okay`).
- SessionStart: when the queue is not empty, adds context with the count and offers okay-reflect, which removes the entries it handles.

Hook scripts are Node with no dependencies, exit 0 and print nothing when there is nothing to do or anything fails, and work outside git repos. If the marker format in `shared/delivery.md` changes, update `hooks/reflect.js` and `tests/hooks.test.js` in the same PR.

## Commits and PRs

- Commit messages: one line, no body, no trailers, `type: subject`.
- PR title `type: subject` (max 70 chars). PR body in English, max 300 words, sections Problem / Cause / Change / Evidence / Not touched / Risks, last line `Closes #<n>`.
- No AI attribution anywhere.
- Only ticket #10 edits `README.md`.

## Worktrees

Create worktrees under `.claude/worktrees/<branch>` (ignored by git). Work only inside your own worktree.

## Content rules

- This repo is public: no detail from private or company repos in any skill, example, or eval.
- Docs, code, and commits are in English.
