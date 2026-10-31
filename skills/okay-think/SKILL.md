---
name: okay-think
description: "L4 lane of the okay-* pack: architecture to ADR and spec, no production code. Grills only the decisions, writes at least two structurally different designs (caller's usage first), has a cross-family judge (Codex, read-only, else a fresh opus) score them against a rubric, builds 1-3 runnable spikes that exercise the risky assumption (measured when it is a performance or scale question), waits for the user's trial feedback, then writes the rationale, an ADR only when the decision is hard to reverse + surprising + a real trade-off (reusing an existing docs/decisions/), and publishes a spec through okay-to-spec. An effort too big for one session becomes wayfinder-style decision tickets on the tracker instead. Use for /okay-think <idea>, 'design the architecture', 'should we use X or Y', hard-to-reverse structural choices. Not for bug fixes, planned features, UI design, or perf measurement."
license: MIT
---

# okay-think

Turn an architecture question into a decision the user has tried, an ADR where one is warranted, and a spec. **Writes no production code.** Rules shared with the rest of the pack live in `shared/`:

- Output and language: [shared/output-style.md](shared/output-style.md)
- Lanes and prototype-first flow: [shared/lanes.md](shared/lanes.md)
- Models: [shared/models.md](shared/models.md)
- Tracker: [shared/tracker.md](shared/tracker.md)
- Repo doc layout: [shared/docs-layout.md](shared/docs-layout.md)
- Commit, PR, merge: [shared/git.md](shared/git.md)
- Contributor mode: [shared/contributor-mode.md](shared/contributor-mode.md)
- Research that hits 429/403/paywall: [shared/monid.md](shared/monid.md)
- Delivery and reflection: [shared/delivery.md](shared/delivery.md)

Supporting files: [RATIONALE.md](RATIONALE.md) (template), [RED-FLAGS.md](RED-FLAGS.md), [RUBRIC.md](RUBRIC.md) (judge brief), [WAYFINDER.md](WAYFINDER.md) (oversized efforts).

Skills called by name: `okay-grilling`, `okay-domain-modeling`, `okay-prototype`, `okay-to-spec`, `okay-to-tickets`, `okay-review`. If one is not installed, say so in one line and do its step by hand from the rules here.

## What "no code" means

- Nothing under the repo's source tree is created or edited. The outputs are prose, an ADR, `CONTEXT.md` terms, and a spec.
- Type and signature sketches (bodies are `not implemented`) may appear inside the rationale and spec text only.
- The one exception is the spikes: throwaway runnable code on a `prototype/<name>` branch, never merged, built by `okay-prototype`.
- Tempted to "just wire it up"? That is the signal to stop and hand off to a ticket (`okay-to-tickets`, then `okay-dev`).

## Task list

Create it first. A step you skip stays on it as `skip: <reason>`.

1. Mode check
2. Ground
3. Size gate
4. Grill the decisions
5. Design twice
6. Judge
7. Spikes
8. Trial
9. Close the gaps
10. Rationale + ADR
11. Spec
12. Review
13. Deliver
14. reflect

## 1. Mode check

- Contributor mode on? Apply [shared/contributor-mode.md](shared/contributor-mode.md) for the rest of the task: nothing in the repo, no issues, notes under `.scratch/`.
- Pick the tracker from [shared/tracker.md](shared/tracker.md).
- Find the decisions folder: `docs/decisions/` if it exists, else `docs/adr/` ([shared/docs-layout.md](shared/docs-layout.md)). Never create a second one.

## 2. Ground

Read before you ask: `CONTEXT.md`, the ADRs in the area, `AGENTS.md`, `CONSTRAINTS.md` when present, and the code the design touches. Dispatch haiku sub-agents for lookups. Write down the constraints the design must honour (callers you cannot break, existing types, invariants, budgets). Naming a file is not grounding: trace the real data flow.

## 3. Size gate

Decide now whether one session can hold this. It cannot when any of these holds:

- more than 3 spikes would be needed to answer the open questions;
- the work spans several subsystems whose interaction you cannot yet state;
- after one grilling round the frontier is still mostly fog.

Too big: follow [WAYFINDER.md](WAYFINDER.md) (chart the map, resolve one decision ticket per session) and stop there. Otherwise continue.

## 4. Grill the decisions

Run `okay-grilling`, short, per the prototype-first rule in [shared/lanes.md](shared/lanes.md). Settle only:

1. The decisions the design must make (not the whole spec).
2. The **risky assumption**: the one belief that, if false, sinks a candidate. Name it as a falsifiable sentence.
3. The trial signals: what the user will do with a spike and what would count as "worked". For a performance or scale assumption, the number that decides.

Facts you can look up are never asked. Use `okay-domain-modeling` the moment a fuzzy term appears, and write the resolved term to `CONTEXT.md` (glossary only; none in contributor mode).

## 5. Design twice

Write the **caller's usage first**: the README a consumer would read plus two or three real call sites. The sketch is derived from it; when they disagree, fix the sketch.

Produce **at least two structurally different designs**. Different means a different answer to at least one of: who owns the state, where the module boundary sits, sync vs async, build vs adopt, push vs pull. Flavours of one shape do not count.

1. Dispatch one fresh opus sub-agent per candidate, in parallel, each given the problem, the grounding, the usage, and **one distinct lens** (for example: smallest possible interface; most flexible for the common case; ports-and-adapters; reuse what exists). Each writes a candidate following [RATIONALE.md](RATIONALE.md), prose and signatures only.
2. Screen every candidate against [RED-FLAGS.md](RED-FLAGS.md). A flag is a reason to revise or reject.
3. Compare on interface depth: prefer the design that hides more behind a smaller surface.

Stuck on one shape after two tries: say so and ask the user for a different constraint. Do not pad with a near-copy.

## 6. Judge

Score the candidates against [RUBRIC.md](RUBRIC.md) with a **cross-family judge**:

1. Codex through the codex plugin's `codex:rescue` subagent, read-only (it may read the repo, it must not write). Write the brief to a file and pass it by file or stdin; never interpolate candidates into a quoted shell argument.
2. Codex missing or errored: a fresh opus sub-agent, high effort, said plainly as `judge: opus (codex unavailable)`. Never block on Codex.

The judge sees the problem, constraints, usage and the candidates in shuffled order labelled A/B/C, without the author lens or any recommendation. It returns scores with a quote per score, the ranking, and the assumption each candidate depends on. Rerun any command it cites before relying on it. The judge ranks and sharpens what to test; **it does not decide**. The user's trial does.

## 7. Spikes

Call `okay-prototype` in its spike shape ([shared/lanes.md](shared/lanes.md) prototype-first rule):

- 1 to 3 spikes, count chosen by how open the question is, stated with the reason in the reply (1 = one risky assumption, 2 = two credible designs, 3 = wide open).
- Each spike exercises the risky assumption from step 4, not the whole design. Candidates compared sit behind one switcher (`--variant` flag or env var).
- Performance or scale assumption: measure it. Fresh process per run, at least 10 runs, A/B interleaved, report the numbers with the machine (CPU, cores, RAM, OS, runtime version). An argument from reading the code is not evidence.
- One command to run everything. Kept on `prototype/<name>`, never merged. Push only with the user's OK; contributor mode keeps it local.

## 8. Trial

Hand over the run command and the trial signals. The user tries the spikes when they get to it; the flow waits. Record the feedback with `okay-prototype`'s record (worked / did not / surprised me, plus verdict). Every line comes from the user or a measurement.

The trial overrides the judge. A candidate the judge ranked first that failed the trial is out; say so in the rationale.

## 9. Close the gaps

Run `okay-grilling` on what the trial left open (its "still open" list), full frontier per round. Update `CONTEXT.md` terms through `okay-domain-modeling`.

## 10. Rationale + ADR

Write the final rationale to `.scratch/<feature>/rationale.md` (untracked, kept out of git through `.git/info/exclude`) following [RATIONALE.md](RATIONALE.md): Problem / Usage / Shape / Synthesis decision / Tradeoffs / Alternatives required / Open questions / Next step. "Synthesis decision" cites the judge's ranking and the trial verdict, and says which won and why when they disagreed.

Then the ADR test, through `okay-domain-modeling`. Write an ADR only when **all three** hold:

1. **Hard to reverse**: changing course later costs real work.
2. **Surprising without context**: a future reader will ask "why this way?"
3. **A real trade-off**: genuine alternatives existed and this one won for stated reasons.

Any one missing: no ADR, and say which test failed in one line. An ADR is short, goes in the decisions folder found in step 1 using the numbering and format already there, and links the spike branch. Contributor mode: no ADR file.

## 11. Spec

Call `okay-to-spec`. It reads the trial-feedback record and the rationale, turns them into user stories and implementation decisions, may inline decision-rich snippets from the chosen spike (state machine, schema, type shape), links `prototype/<name>`, and publishes to the tracker. Then post the rationale as the first comment on the spec issue (Linear `save_comment`, `gh issue comment`, `glab issue note`; local: it stays in `.scratch/<feature>/`).

Cutting tickets is a separate step the user triggers (`okay-to-tickets`); offer it, do not start it.

## 12. Review

ADR or `CONTEXT.md` changed: open a PR with them only (commit `docs: <subject>`, body per [shared/git.md](shared/git.md)) and call `okay-review` with lane L4 and the spec as contract. Round rules are in [shared/review.md](shared/review.md); the merge waits for the user's explicit approval (L2+ policy). No repo files changed (no ADR, contributor mode): `skip: no PR`.

## 13. Deliver

Reply in Chinese per [shared/output-style.md](shared/output-style.md): the spec link first, then the decision in one line, the trial verdict, ADR path or why none, and the spike branch. Open risks go in as questions. The delivery ends with the link, or numbered next steps (at most 5), per [shared/delivery.md](shared/delivery.md). Then write the marker and run `okay-reflect`.
