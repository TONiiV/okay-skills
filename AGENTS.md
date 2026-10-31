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
