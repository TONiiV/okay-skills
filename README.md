# Okay-Skills

`okay-*` is a development skill pack for Claude Code and claude.ai. It classifies each dev request into a lane, runs only the process that lane needs, keeps the implementer and the reviewer as separate agents, ends every task with a PR/MR, an issue, or explicit next steps, and closes with a reflection that turns repeated mistakes into reviewed skill changes.

The repo also holds `paper-tree`, an unrelated skill (see [paper-tree](#paper-tree)).

## Skills

Fourteen `okay-*` skills. Start with `okay-dev`; every other skill can also be called directly (`/okay-fix ...`, `/okay-perf ...`).

| Skill | What it does |
|---|---|
| `okay-dev` | Entry router and PM: picks the lane, splits compound prompts, dispatches agents, owns merge policy, and runs the feature flow (L2/L3) |
| `okay-fix` | L1 lane: small fixes and bug fixes, reproduce first, fix the root cause, one fresh-agent review |
| `okay-think` | L4 lane: architecture. At least two designs, a judge, an ADR and a spec; no production code |
| `okay-design` | L5 lane: UI/UX. One batched intake, three variants built in parallel, screenshots side by side |
| `okay-review` | Independent reviewer used by every lane: standards and spec axes, proven findings only |
| `okay-perf` | Performance lane: claim, platform spec, interleaved baselines, statistical verdict, attempt ledger |
| `okay-reflect` | Post-task reflection: evidence-backed skill defects become lesson candidates |
| `okay-pm` | Linear triage, next-batch planning, and project status updates |
| `okay-grilling` | Fork. Grill a plan, one round asks every answerable question with a recommended answer |
| `okay-domain-modeling` | Fork. Keep the `CONTEXT.md` glossary and ADRs sharp |
| `okay-to-spec` | Fork. Turn the conversation into a spec in the tracker, no interview |
| `okay-to-tickets` | Fork. Split a spec into tracer-bullet tickets with blocking edges |
| `okay-tdd` | Fork. Red-green loop at pre-agreed seams |
| `okay-prototype` | Fork. 1-3 throwaway runnable samples and a trial-feedback record before the spec |

Shared rules (output style, commit/PR, model table, Monid, contributor mode, Jev) live once in `shared/` and are copied into each skill by `npm run build`, so each skill works when uploaded alone.

## Install on a machine (Claude Code)

```bash
claude plugin marketplace add TONiiV/okay-skills
claude plugin install okay-skills@okay-skills
```

On Claude Code 2.1.275 or later one step also works: `/plugin install okay-skills --marketplace TONiiV/okay-skills`.

The plugin carries the skills and three hooks (Stop, SessionEnd, SessionStart) for the reflection reminder. The hooks run with `node`, so Node must be on `PATH`. Nothing touches `settings.json`.

### Make okay-dev the default

Add this exact line to `~/.claude/CLAUDE.md`:

```
For any software development request without a slash command (build, fix, change, refactor, review, ship), start with the okay-dev skill and follow its routing.
```

### `~/.claude/okay.local.md`

Machine-local, never committed. Each bullet under `## Contributor repos` is a pattern (`*` matches anything), checked against the origin URL and the repo's top-level path. A match turns on contributor mode: no issues, no repo docs, specs and tickets kept local and untracked, MR description output, nothing sent to Jev or Codex, no merge. No file means contributor mode is off. Write patterns that match both remote forms (HTTPS `https://host/team/repo` and SSH `git@host:team/repo.git`), and a local path if you use one. The rules are in [`shared/contributor-mode.md`](shared/contributor-mode.md).

```markdown
# okay local settings

## Contributor repos
- *gitlab.example.com*some-team/*
- */work/company-repo
```

### Jev (optional router classifier)

If `OPENROUTER_JEV_API_KEY` is set and contributor mode is off, `okay-dev` asks Jev two things only: the lane and the model tier. It sends a one-line task summary plus the lane and tier lists, never the task, code or conversation. Without the key, `okay-dev` classifies itself.

Turn Jev's own router hook off, so it does not suggest handing the whole request to a `jev-*` helper agent (that agent would work without your conversation):

```bash
python ~/.claude/skills/jev/scripts/jev.py router off
```

### L1 auto-merge needs an allow rule (optional)

Claude Code's auto-mode classifier refuses `gh pr merge` and `glab mr merge` without an explicit allow rule. Without the rule, the skills stop at `APPROVED` and hand you the PR link to merge. To let L1 PRs merge themselves after review and green CI, add to `permissions.allow` in `~/.claude/settings.json` (or one repo's `.claude/settings.json`):

```json
"Bash(gh pr merge:*)",
"Bash(glab mr merge:*)"
```

Trade-off: the rule applies to every PR any session can reach, not only L1 ones. The "L2+ waits for your approval" policy is then a skill rule, not a permission. Scope the rule to the repos where you want it, and keep branch protection and required CI checks on.

### Linear

Own repos use Linear by default (team `TON`; set the tracker per repo with a `Tracker:` line in `AGENTS.md`).

1. Add the Linear connector (claude.ai Settings > Connectors, or `/mcp` in Claude Code). Without it the skills fall back to GitHub issues and say so.
2. Install Linear's GitHub integration (Linear Settings > Integrations > GitHub). Branches carry the issue id (`ton-12-short-slug`) and PR bodies end with `Fixes TON-12`, which links and closes the issue.
3. One Linear Project per repo. A spec is a parent issue labelled `spec`; tickets are its sub-issues with `blocks` relations and the `ready-for-agent` label.

### Lesson inbox

`okay-reflect` files candidate lessons as issues in a private `TONiiV/okay-lessons` repo (labels `lesson:candidate`, `lesson:promoted`, `lesson:rejected`, and `skill:<name>`), and promotes one only after the same class appears twice. Create it once:

```bash
gh repo create TONiiV/okay-lessons --private
gh label create lesson:candidate -R TONiiV/okay-lessons
gh label create lesson:promoted -R TONiiV/okay-lessons
gh label create lesson:rejected -R TONiiV/okay-lessons
```

A promotion reaches this public repo only as a PR you approve, with project details stripped.

## Install on claude.ai (cloud sessions)

Cloud sessions do not load plugins or `~/.claude/`; uploading the skills to your account is the only cloud path. Frontmatter is already limited to the six keys claude.ai accepts.

```bash
npm run package   # builds, then writes dist/<skill>.zip for every okay-* skill (dist/ is gitignored); needs Node 20.15+
```

Then, for each zip in `dist/`: claude.ai > Settings > Capabilities > Skills > Upload skill. Upload all fourteen: `okay-dev` calls the others by name. Each zip has the skill folder as its root (`okay-fix/SKILL.md`).

In the cloud: skill descriptions route the request (there is no CLAUDE.md pointer); there is no `okay.local.md` (contributor mode is off) and usually no Jev key (`okay-dev` classifies itself); the plugin hooks do not run, so reflection relies on the last step of each task list.

## Update

```bash
claude plugin marketplace update okay-skills
claude plugin update okay-skills@okay-skills
```

For claude.ai, run `npm run package` again and re-upload the zips.

## paper-tree

`paper-tree` generates fully interactive HTML paper lineage trees for any academic field. Install it alone with:

```bash
npx skills add https://github.com/TONiiV/okay-skills --skill paper-tree
```

Use it by pointing the assistant at its file: `"Use @[skills/paper-tree/SKILL.md] to draw a lineage tree for Diffusion Models."`

![Skill Intro Screenshot](./screenshot.png)

## Repository structure

- `skills/`: one folder per skill, each self-contained with a `SKILL.md`, optional reference files, `evals.json` and `NOTICE.md`. `skills/okay-*/shared/` is generated.
- `shared/`: single source of the rules shared by every `okay-*` skill.
- `hooks/`: plugin hooks for the reflection reminder.
- `scripts/`: `build.js` copies `shared/` into each skill; `package.js` writes the claude.ai zips.
- `tests/`: `node:test` suites and evals.

## Testing

```bash
npm test
claude plugin validate .
```

`npm test` fails when a shared copy drifts, a frontmatter key is outside the allowed six, a link escapes a skill folder, evals fall below the minimums, or a zip is missing its `SKILL.md`. After any change in `shared/`, run `npm run build` and commit the copies. See [`AGENTS.md`](AGENTS.md).

## Credits

The pack is MIT licensed. It forks and borrows from the projects below; each skill's `NOTICE.md` lists exactly what it uses and carries the full MIT license text and the edits made to forks.

| Source | License | Used for |
|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills), Copyright (c) Matt Pocock | MIT | Forks: `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `tdd`, `prototype`. Ideas from `diagnosing-bugs` (`okay-fix`), `triage` (`okay-pm`), `code-review` (`okay-review`), `wayfinder` (`okay-think`) |
| [pstack](https://github.com/cursor/plugins/tree/main/pstack) by poteto, Copyright (c) 2026 Lauren Tan | MIT | Feature, bug-fix, prototype, perf-issue and hillclimb playbooks, `benchmark-checklist`, `reflect`, `correct`, `architect`, `interrogate`, `blast-radius` |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), Copyright (c) 2025 Addy Osmani | MIT | Task size table, doubt-driven review, performance checklist and attempt ledger |
| [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd), Copyright (c) 2026 Ayoub Ghriss | MIT | Condensed output style in `shared/output-style.md` |
| [anthropics/skills](https://github.com/anthropics/skills) `frontend-design`, Copyright Anthropic, PBC | Apache-2.0 | Called by `okay-design` when installed; the commit-to-a-direction idea |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable), Copyright Paul Bakaus | Apache-2.0 | Called by `okay-design` when installed; the P0-P3 scale and two-part critique |
| [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) `landing-page-design`, Copyright (c) 2026 Elaya | MIT | Called by `okay-design` when installed; the single batched intake |
| [alibaba/skill-up](https://github.com/alibaba/skill-up) | Apache-2.0 | Evidence-backed failure attribution in `okay-reflect` (ideas only; no code or text redistributed) |
| Trace2Skill ([arXiv:2603.25158](https://arxiv.org/abs/2603.25158)) | Paper | Skill updates only for recurring, attributable failures |
| [gstack](https://github.com/garrytan/gstack) by Garry Tan | Idea credited | Review depth that scales with diff size and risk |
| Emery Berger, "Performance Matters", Strange Loop 2019 | Talk | Layout effects, statistical tests, causal profiling in `okay-perf` |
