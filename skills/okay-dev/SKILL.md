---
name: okay-dev
description: "Default entry point for any software development request without a slash command: build, add, implement, change, refactor or ship code, a feature, a ticket, or a new product. Router and PM of the okay-* pack: classifies each request into a lane, splits a compound prompt into parallel sub-tasks by file ownership, dispatches each to the right skill and model, and drives it to a PR/MR, an issue, or explicit next steps. Branches: a small bug goes to okay-fix; an existing issue, spec or ticket link runs the L2 implement/review loop; a new feature or a new product runs prototype-first (grill, samples, trial feedback, spec, tickets, TDD, review loop); architecture goes to okay-think; UI/UX goes to okay-design; speed or latency goes to okay-perf. Honors contributor mode. Not for questions that change no code, and not when the user already named another okay-* skill."
license: MIT
---

# okay-dev

Route every dev request to the right lane and run it to delivery. You are the PM: in L2 and above you never write or review code yourself. Rules shared with the rest of the pack live in `shared/` and are not restated here:

- Lanes, L1 threshold, escalation, prototype-first, task size: [shared/lanes.md](shared/lanes.md)
- Models and effort: [shared/models.md](shared/models.md)
- Jev: [shared/jev.md](shared/jev.md)
- Review contract: [shared/review.md](shared/review.md)
- Commit, PR, merge policy: [shared/git.md](shared/git.md)
- Tracker: [shared/tracker.md](shared/tracker.md)
- Contributor mode: [shared/contributor-mode.md](shared/contributor-mode.md)
- Delivery and reflection: [shared/delivery.md](shared/delivery.md)
- Output and language: [shared/output-style.md](shared/output-style.md)

## Task list

Create it first. Steps that do not apply stay as `skip: <reason>`.

1. Mode check
2. Split
3. Classify
4. Dispatch (per sub-task: the lane flow below)
5. Merge
6. Deliver
7. reflect

## 1. Mode check

1. Contributor mode per [shared/contributor-mode.md](shared/contributor-mode.md). On: the rules there override every step below (see Contributor mode).
2. Pick the tracker per [shared/tracker.md](shared/tracker.md).
3. Note the base branch per [shared/git.md](shared/git.md).

## 2. Split

A prompt that asks for more than one independent outcome is compound. Split it into sub-tasks, one outcome each, in the user's own words.

1. For each sub-task, list the files or modules it will own (read the code; do not guess).
2. Size each with the task-size table in [shared/lanes.md](shared/lanes.md). L must be split further, XL must be split; split along module seams.
3. Two sub-tasks that would write the same file are not parallel: merge them into one, or order them with a blocking edge.

A single-outcome prompt is one sub-task: `skip: single task`.

## 3. Classify

Give each sub-task exactly one lane from [shared/lanes.md](shared/lanes.md), plus one extra route:

- **New product** has its own row in [shared/lanes.md](shared/lanes.md): run it through the L3 flow below, which is prototype-first.
- An issue, spec or ticket link (or an identifier such as `#12`, `TON-12`) is L2, unless the ticket itself is unplanned (no acceptance criteria): then L3.
- A bug or small change with an estimate inside the L1 threshold is L1. Unsure whether it fits: L1, and let the escalation catch it.

### Jev

Ask Jev only when `OPENROUTER_JEV_API_KEY` is set and contributor mode is off ([shared/jev.md](shared/jev.md)). Jev picks the lane and the model tier, nothing else.

1. Write a one-line summary of the sub-task: no code, no file contents, no names of people, clients or private repos.
2. Write the request to a temp file and send it the way [shared/jev.md](shared/jev.md) says (local `jev` script first):

   ```json
   {
     "state": {"task": "<one-line summary>"},
     "questions": {
       "lane": {"type": "choice", "instructions": "Which lane fits `task`?",
                "criteria": {"L1": "small fix inside the L1 threshold", "L2": "planned: an existing issue, spec or ticket", "L3": "new feature with no agreed plan", "L4": "architecture, no code", "L5": "UI/UX work", "perf": "a performance claim or regression"}},
       "tier": {"type": "choice", "instructions": "Smallest model tier that implements `task` well?",
                "criteria": {"haiku": "lookups, mechanical edits", "sonnet": "normal fixes and tickets", "opus": "architecture, cross-module work"}}
     }
   }
   ```

3. Fall back to classifying yourself on any condition in [shared/jev.md](shared/jev.md) rule 5. A new product comes back as L3, which runs the same flow.
4. Jev only classifies. Never hand Jev, or a `jev-*` helper agent the Jev router suggests, the whole request; okay-dev dispatches its own agents.

Tell the user the routing in one line per sub-task before dispatching: `1. <sub-task> | L3 | sonnet high | okay-dev L3 flow | <reason>` (add `(Jev 0.82)` when Jev decided).

## 4. Dispatch

Dispatch sub-tasks with no blocking edge in parallel, in one message. Each agent gets: the sub-task in the user's words, the conversation context it needs, the files it owns (and an instruction not to touch others), the skill to run, and the model and effort from [shared/models.md](shared/models.md).

| Lane | Runs |
|---|---|
| L1 | okay-fix. A lone L1 task may run in the main thread; inside a compound prompt, dispatch a sonnet high agent per L1 sub-task. |
| L2 | L2 flow below |
| L3, new product | L3 flow below |
| L4 | okay-think, opus high |
| L5 | okay-design |
| perf | okay-perf |

### L1 escalation

okay-fix stops with `L1 exceeded: <condition> (<measured value>)` and a suggested lane. Then:

1. Re-classify the task with that evidence (the suggestion is input, not a verdict).
2. Tell the user in one line: what was exceeded, the measured value, the new lane.
3. Continue in the new lane from the working tree okay-fix left. Nothing was committed, so nothing is undone.

### L2 flow

Planned work is not re-planned: `skip: grill`, `skip: prototype`, `skip: spec`, `skip: tickets`.

1. Fetch the issue, spec or ticket and its comments. No acceptance criteria: re-classify as L3 and say why.
2. Size it. L or XL: ask the user to split it with okay-to-tickets before building.
3. Throughput checkpoint (below), then the ticket loop.

### L3 flow (also new product)

1. **okay-prototype.** Its first step is the short okay-grilling round that names only the decisions the samples must answer and the trial signals. Then 1-3 samples, built by dispatched sonnet high agents, on `prototype/<name>`.
2. **User trial.** Hand over the one command or URL. Wait for the user; collect worked / did not / surprised me into `FEEDBACK.md` as okay-prototype describes.
3. **okay-grilling** on the gaps the trial left open. Never re-ask what the trial settled.
4. **okay-to-spec.** Check the published spec names the chosen sample and links `prototype/<name>`; if not, have it amended before moving on.
5. **okay-to-tickets.** Every ticket S or M; blocking edges set.
6. **Throughput checkpoint**, then the ticket loop.

### Throughput checkpoint

Write it as three task items before any implementation. An item that does not apply stays as `n/a: <reason>`.

- **Blocking first steps:** tickets that gate the others (prefactors, schema, shared types). They run first, alone.
- **Independent workstreams:** tickets with disjoint files run in parallel; shared writes serialize.
- **Shared mutable state:** files, tables, config or generated output more than one ticket writes. Split the target where you can; serialize only for a real invariant.

Show it with the planned agents and tiers and ask once: "Start these tickets and push their branches and PRs?" This one OK covers the pushes and PRs of the batch ([shared/git.md](shared/git.md)).

### Ticket loop

Per ticket, in its own worktree (the repo's convention, else `git worktree add .claude/worktrees/<branch> -b <branch> $(git symbolic-ref --short -q refs/remotes/origin/HEAD || echo origin/main)`; branch name per [shared/tracker.md](shared/tracker.md)):

1. **Implement.** A fresh agent, sonnet high (opus high when cross-module), runs okay-tdd at the seams the spec agreed, runs the full suite once at the end, commits per [shared/git.md](shared/git.md), pushes, and opens the PR with the body from [shared/git.md](shared/git.md).
2. **Review round.** Call okay-review with the PR, the contract links (request, spec, ticket), the lane and the round number. It does one round and returns the verdict. Never pass it the implementer's summary.
3. **Verdict.**
   - `APPROVED`: go to Merge.
   - `CHANGES REQUESTED`: dispatch a separate fresh fixer agent (sonnet high; never the implementer, never the reviewer) with the PR, the open `[R<n>-<k>]` findings and the contract. It pushes fixes and answers each finding in one PR comment. Then call okay-review again with round + 1.
   - `ESCALATE`, or still not approved after round 3: stop this ticket. Tell the user the open findings and the PR link; the loop does not continue without them.
4. After each wave of merged tickets on Linear, post the project status update ([shared/tracker.md](shared/tracker.md)).

## 5. Merge

Follow the merge policy in [shared/git.md](shared/git.md). L1 merges happen inside okay-fix; okay-dev merges L2+ PRs only.

## 6. Deliver

Reply in Chinese per [shared/output-style.md](shared/output-style.md): the PR/MR links (or issue link, or numbered next steps) first, one line per sub-task with its lane and state. Then follow [shared/delivery.md](shared/delivery.md): write the marker and run okay-reflect.

## Contributor mode

All of [shared/contributor-mode.md](shared/contributor-mode.md) applies. What it adds in okay-dev:

- okay-to-spec and okay-to-tickets write under `.scratch/`; the prototype branch stays local.
- Each ticket ends in an MR; okay-review returns its comment body instead of posting it.
- No Linear status updates.
