---
name: okay-design
description: "L5 lane of the okay-* pack: UI/UX work. One batched intake (purpose, audience, constraints), then three clearly different variants built in parallel by separate agents behind one switcher (fewer only when the user says so), screenshots side by side, the user picks or merges ideas, the chosen one is built properly, then before/after screenshots at the same viewport and state (320/768/1024/1440, all states, a11y check) and an independent critique/audit by a fresh agent before the PR. Uses Anthropic frontend-design, pbakaus/impeccable and elayadesign landing-page-design when installed, with a condensed built-in checklist as fallback. Use for /okay-design followed by the UI task, or when the user asks to design, redesign, restyle or lay out a page, screen or component. Not for bug fixes in existing UI, logic-only work, or performance."
license: MIT
---

# okay-design

Design a UI by looking at three real options, not by correcting one guess. Rules shared with the rest of the pack live in `shared/`:

- Output and language: [shared/output-style.md](shared/output-style.md)
- Lanes: [shared/lanes.md](shared/lanes.md)
- Models: [shared/models.md](shared/models.md)
- Review contract: [shared/review.md](shared/review.md)
- Commit, PR, merge: [shared/git.md](shared/git.md)
- Tracker: [shared/tracker.md](shared/tracker.md)
- Contributor mode: [shared/contributor-mode.md](shared/contributor-mode.md)
- Delivery and reflection: [shared/delivery.md](shared/delivery.md)

Supporting files in this folder:

- [CHECKLIST.md](CHECKLIST.md): the fallback design checklist and the critique scoring scale.
- [briefs.md](briefs.md): prompts for the variant builders, the switcher, the builder of the chosen design, the critic and the fixer, plus the switcher and contact-sheet snippets.
- [shoot.js](shoot.js): dependency-free screenshots at exact widths.
- [a11y-probe.js](a11y-probe.js): a console probe for objective accessibility failures.
- [style-seed.js](style-seed.js): draws a random style seed and maps it to one pick per style axis, so variants do not converge on one template.

This is lane L5, so the main thread is the PM: it runs the intake, writes the briefs, dispatches agents, takes screenshots and talks to the user. It does not write or review UI code. Every code change below goes to a subagent.

## Task list

Create this task list first. A step you skip stays on it as `skip: <reason>`.

1. Mode and tooling check
2. Intake
3. Baseline (before screenshots)
4. Variants
5. Show
6. Pick
7. Build the chosen design
8. Verify (after screenshots, states, a11y)
9. Critique and audit
10. PR and review
11. Merge
12. Deliver
13. reflect

## Precedence

When rules disagree, the first one wins: the user's request, then the project's own design system and tokens (`DESIGN.md`, `.impeccable.md`, `AGENTS.md`, the existing theme), then the installed design skills, then [CHECKLIST.md](CHECKLIST.md). A skill that bans a font the project already uses does not get to rewrite the project's typography.

## 1. Mode and tooling check

1. Contributor mode on? Apply [shared/contributor-mode.md](shared/contributor-mode.md) for the rest of the task. Pick the tracker from [shared/tracker.md](shared/tracker.md). Note the base branch (per [shared/git.md](shared/git.md)).
2. Find how the UI runs: the dev command and URL, the framework, the styling system, the component library, the test and lint commands. A static page runs from a local file server; say which. Nothing runnable: the task becomes "build a runnable page first", and you say so in the intake.
3. **Check, do not assume, which design skills are installed.** A skill counts as installed when it is in this session's skill list, or its `SKILL.md` exists in `~/.claude/skills/<name>/`, `<repo>/.claude/skills/<name>/`, or under `~/.claude/plugins/`. In claude.ai or a cloud session only the session's skill list counts. Check these names:

   | Stack | Names | Used for |
   |---|---|---|
   | Anthropic frontend-design (anthropics/skills) | `frontend-design` | Aesthetic direction for every builder |
   | pbakaus/impeccable | `critique`, `audit`, `polish`, `typeset`, `arrange`, `adapt`, `harden` (others optional) | Critique and audit by the independent agent, and refinement passes in the build |
   | elayadesign/ai-design-skills | `landing-page-design` | Only when the surface is a landing or marketing page |

   Read an installed skill before telling an agent to use it. If `landing-page-design` is not installed but the repo has network access, you may read it with `gh api repos/elayadesign/ai-design-skills/contents/skills/landing-page-design/SKILL.md --jq .content` and decode it from base64. Reading is fine; do not install anything without asking.
4. Write one line to the user: `Design stack: frontend-design <yes|no>, impeccable <list|no>, landing-page-design <yes|no>. Fallback checklist covers: <what is missing>.` Anything missing is covered by [CHECKLIST.md](CHECKLIST.md). Never block on a missing skill. Pencil is optional and not required; use a `.pen` mockup only when the user asks for one, because variants here are real, runnable code.
5. **Pick the screenshot tool, and say which one you used.**
   1. The Claude desktop browser pane tools (`navigate`, `resize_window`, `computer` screenshot, `javascript_tool`) when present. They need an `http://` page, not a `file://` page: serve static files first. Set the viewport with `resize_window` and confirm `innerWidth` equals the requested width.
   2. Otherwise `node shoot.js <url> <outDir> --name <name>` from this folder (Node 22+, Chrome, Edge or Chromium). Plain `--screenshot --window-size=320,...` is wrong: headless Chrome and Edge clamp the layout width to about 500px, so a "320" image shows a 504px layout. `shoot.js` sets the width through the DevTools protocol and prints the measured `innerWidth` for each image; a line ending in `MISMATCH` means the image is not valid evidence.
   3. Neither works: say so, ask the user for a screenshot route, and mark the verification steps `skip: no screenshot tool`. Never describe a screen you did not capture.

## 2. Intake

Ask once, in one batched message. Ask only what you cannot look up in the repo, and give each question a recommended answer so the user can reply "all as recommended".

- **Purpose**: the one thing this UI must let someone do, and what counts as success.
- **Audience**: who uses it, on what device, in what situation.
- **Constraints**: brand, existing design system, framework limits, content that already exists, deadlines, anything that must not change, accessibility level, which states matter (loading, empty, error, long content).
- **Tone** (one line): the feeling it should give.

Questions the user does not answer become assumptions, stated together in one line (`Assumed: ...`), and the work continues. The intake answers plus the assumptions are the **design context** for every agent. Pass it in the brief so no builder starts its own interview.

## 3. Baseline (before screenshots)

Do this before any variant exists, on the base branch.

- The task changes an existing screen: capture `before` at 320, 768, 1024 and 1440 in the default state, and in every other state the task touches. Force a state through the app (a query flag, seed data, a fixture) or `--eval`, and record how, so step 8 repeats exactly the same state.
- A new surface with nothing to compare: write `before: none (new surface)` and skip the pair.

Keep screenshots under `.scratch/design/<slug>/{before,after,variants}/`. If `.scratch/` is not ignored, add it to `.git/info/exclude`. Name files `<kind>-<state>-<width>.png`, for example `before-default-320.png`.

## 4. Variants

**Three variants, by default.** Fewer only when the user says so (for example "just one", "two options"); then build exactly what they asked for, state the count with their instruction as the reason, and continue the flow with that count. More than three is never useful.

1. **Draw one style seed per variant.** Run `node style-seed.js` from this folder once per variant. Each run draws a fresh random seed and prints its picks for palette and base hue, type, scale, layout, density, shape, texture and motion. The seed keeps variants from all sliding into the same template.
   - Each variant follows its seed's picks. It may break a pick only for accessibility or contrast, and says which and why.
   - The user's request and the project's design system (see Precedence) win: the seed fills only the axes they leave open. Mark the others `user` or `project`.
   - Two seeds with the same layout: draw again for the later variant, so structures still differ.
   - Record the seed in the direction brief, at the top of the variant's entry file (`style-seed: <n>`) and in the step 5 reply. `node style-seed.js <n>` reproduces the picks.
   - No shell (for example claude.ai without code execution): say so, choose a 9-digit seed yourself and derive the picks by hand from the tables in [style-seed.js](style-seed.js), using the rule in its header. Record it as `<seed> (manual)`. `node style-seed.js` does NOT reproduce a manual seed; re-run the header rule by hand instead.
2. **Write three direction briefs**, built on the seeds' picks. The three must differ in structure, not just in colour. Choose at least two of these axes and make every variant take a different position on them:
   - layout archetype (single narrative column, split panes, dense dashboard grid, sidebar plus canvas, card wall, list-first)
   - information hierarchy and the primary affordance (what the eye lands on and what the first click is)
   - density (airy to compact)
   - tone and typographic voice (editorial, utilitarian, playful, quiet, technical)
   - colour strategy (monochrome with one accent, warm neutral, high contrast, dark-first)

   Test: if two directions can be described with the same sentence, redo one of them with an explicit "do not use <the shared pattern>" line. Three card grids with three palettes is wallpaper.
3. **Build in parallel.** Spawn one fresh agent per variant in the same message, each with its own direction and its own directory (`variants/a/`, `variants/b/`, `variants/c/`), so no two agents touch the same file. Use the variant-builder brief in [briefs.md](briefs.md). Model: sonnet, high effort. Tell each builder to load `frontend-design` (and `landing-page-design` for a landing page) when step 1.3 found them; otherwise to follow [CHECKLIST.md](CHECKLIST.md).
4. **Follow the prototype playbook** (borrowed from pstack): speed over polish, throwaway code, no tests, no abstractions, real data or stubs, read-only. The rigor is in picking the right design cheaply.
5. **One switcher.** After the builders return, one haiku agent wires them behind a single switcher (spec in [briefs.md](briefs.md)): a `?variant=a|b|c` search param, a small fixed bar with previous and next buttons and the variant name, and arrow keys. Prefer to host the variants on the real route so they sit next to the real header, data and density; use a throwaway `prototype` route only when no host page exists. The switcher is hidden in production builds.
6. **Keep it off main.** Create `prototype/<slug>` from the base branch before writing, commit the variants and the switcher there, and never merge it. Push it only with the user's OK. Contributor mode: stays local. Commit messages follow [shared/git.md](shared/git.md).
7. **Check the result yourself.** Open each variant, confirm it runs from the one command or URL, and confirm the three are visibly different. A variant that crashes or duplicates another goes back to its builder once.

## 5. Show

Capture each variant at 1440 and 320 in the default state (add the state that matters most when the task is about one). Put them side by side with the contact-sheet snippet from [briefs.md](briefs.md), view it, and show the user the sheet plus the individual images.

Reply with, in this order: the run command or URL and the `?variant=` keys, the sheet, then one line per variant naming its style seed, its direction and its main trade-off. Say which screenshot tool you used. End with the single question in step 6.

## 6. Pick

Ask once: "Pick A, B or C, or tell me what to take from each (for example the header of B and the list of C)."

- A pick or a merge: record it in one line (`Chosen: B; list from C; reason: <the user's words>`) and go on.
- "None of them": ask what was wrong, add that as a constraint, and run step 4 again with three new directions. A second miss: stop and ask the user to describe or link what they have in mind. Do not loop.
- The user stays silent and cannot be reached: say so, deliver the variants and the sheet as the result, and stop. Do not pick for them.

## 7. Build the chosen design

1. Branch from the base branch: the tracker's branch name when a ticket exists (see [shared/tracker.md](shared/tracker.md)), otherwise `design/<slug>`. The variants and the switcher never come to this branch.
2. Spawn a fresh builder (sonnet, high; opus when the change crosses modules) with the builder brief from [briefs.md](briefs.md): the design context, the chosen variant's path as a reference (and the second variant's path for a merge), the project's conventions. The prototype code is a sketch: rewrite it to production standards, reuse existing components and tokens before inventing new ones, and build every state from [CHECKLIST.md](CHECKLIST.md), not only the one the variant showed.
3. Refinement passes when installed: `typeset`, `arrange`, `adapt`, `polish`, `harden`, each by a builder agent. Without them, the builder applies [CHECKLIST.md](CHECKLIST.md) sections 3 to 8 itself.
4. Run the repo's typecheck, lint and tests. Add or update a test where the repo tests UI. Remove any leftover prototype code.

## 8. Verify

Capture `after` with the same tool, viewport and forced state as the baseline.

| What | Rule |
|---|---|
| Widths | 320, 768, 1024, 1440 in the default state |
| States | Every other state the design has (hover, focus-visible, active, disabled, loading, empty, error, success, long content) at 320 and 1440 at least. A state you cannot force is listed as `not captured: <why>`, never skipped silently. |
| Pairs | Each `after` file has a `before` file at the same viewport and state; build side-by-side pairs with the contact-sheet snippet |
| Overflow | No horizontal scroll at any width; `shoot.js` flags it, or check `scrollWidth > clientWidth` |
| A11y | Run [a11y-probe.js](a11y-probe.js) at 320 and 1440, tab through the main flow and screenshot the visible focus ring, check contrast of text and UI edges, and check 200% zoom and reduced motion. Use the repo's own axe or Lighthouse setup too when it exists. Report failures with the element. |

Fix what the pairs and the probe expose by sending the findings to a builder agent, then recapture.

## 9. Critique and audit

A **fresh agent** (opus, high effort, never the builder or a variant author) critiques and audits the result. It gets: the design context from the intake, the `before` and `after` screenshots, the URL to run, the diff, and the standards files. It does not get the builder's explanation or any claim of what is good or accessible. Use the critic brief in [briefs.md](briefs.md).

- `critique` and `audit` installed: the critic runs both. `critique` judges hierarchy, information design, consistency and AI-generic tells. `audit` checks accessibility, performance, theming and responsiveness technically. Their P0 to P3 ratings are used as they are.
- Otherwise: the critic scores the result against [CHECKLIST.md](CHECKLIST.md) with its P0 to P3 scale.

Findings follow [shared/review.md](shared/review.md): `[R<round>-<n>] blocking|non-blocking`, each proven by a screenshot file and region, a command and its output, or a measured value. P0 and P1 are blocking. A finding without proof is dropped.

Blocking findings go to a separate fixer agent (sonnet, high; the critic never fixes). Then return to step 8 for the affected states and widths, and run a fresh critic on the new result. The 3-round cap and the escalation to the user from [shared/review.md](shared/review.md) apply. Post the final critique with the PR.

## 10. PR and review

1. Commit with one line, no body, no trailer, in the repo's style, else `feat: <subject>` (or `fix:` / `refactor:` as it fits). Push with the user's OK, then open the PR with the body from [shared/git.md](shared/git.md).
2. In Evidence put the before/after pairs and the verification table: widths, states captured and not captured, the a11y probe result, the critique verdict, and the screenshot tool used. Screenshots live on `prototype/<slug>` (commit `screenshots/` there) and the PR links them; if that branch cannot be pushed, name the local paths. Change names the chosen variant and what came from the others. Not touched lists the design areas left alone.
3. Run `okay-review` with lane L5 for code review (opus, rounds, 3-round cap). If `okay-review` is not installed, say so in one line and spawn a fresh opus reviewer under [shared/review.md](shared/review.md). Post the critique as a PR comment before the review starts.

Contributor mode: open an MR with the Problem / Cause / Fix / Evidence description and list the screenshot paths for the user to attach. No issues, no repo docs, no push of `prototype/*`. No remote: commit on the branch and skip the PR (`skip: no remote`).

## 11. Merge

L5 is L2 or above: merge only after the user explicitly approves in the conversation, and only when the allow rule from [shared/git.md](shared/git.md) is set. Without the rule, stop at `APPROVED` and hand the PR link to the user. Contributor mode never merges.

## 12. Deliver

Reply to the user in Chinese per [shared/output-style.md](shared/output-style.md): the PR link first (or the issue link, or next steps), then the chosen variant and why, the before/after pairs, anything not verified, and the design skills that were missing, as one line the user can act on. Then follow [shared/delivery.md](shared/delivery.md): write the marker and run `okay-reflect`.

## Anti-patterns

- Variants that differ only in colour or copy.
- A shared layout component across variants, which removes the point of comparing structure.
- Building the chosen design by renaming the prototype and keeping it. Rewrite it.
- Screenshots at 320 from a browser whose layout width is not 320.
- A critic that is shown the builder's summary, or that is the builder.
- Picking for the user, or looping more than twice on "none of these".
- Writing a design skill's rules from memory when it is installed: read it.
