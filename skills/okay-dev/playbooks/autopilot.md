# Autopilot

Run a queue of independent PRs to merged while the user is away. Needs an autonomy grant ([../shared/autonomy.md](../shared/autonomy.md)). No grant: this playbook does not apply and the normal okay-dev flow runs.

The PM thread owns the queue, the verdicts and the merges. It never writes or reviews code.

## 1. Frame the run

1. Write the scope the grant names: the tickets or PRs, nothing more. A PR or ticket outside it keeps the default gates.
2. Write the exit condition as something you can check: "PRs for #12 and #14 merged, or parked with a reason".
3. Start the decision trail and add its first line: the grant in the user's words, and the scope.
4. Run Split and Classify as usual. Show the throughput checkpoint and go on without waiting.
5. Park now what cannot run unattended: an L4 sub-task after its spikes, an L3 at its prototype trial (unless the user skipped the prototype), an L5 at its variant pick. Say so in the routing line.

## 2. One owner per PR

- Each PR has exactly one owner agent at a time. The owner is the only writer on that branch.
- The first owner is the implementer of the ticket loop. After `CHANGES REQUESTED` the fresh fixer becomes the owner; the implementer never fixes its own findings.
- The owner opens the PR early so CI runs alongside, then drives it to merge-ready with [babysit.md](babysit.md).
- PRs branch off the base, never off each other, so each lands alone. Tickets with a blocking edge wait for the PR they need to merge.
- Assume an agent can die. Every finished unit is pushed before the next starts. A replacement owner starts from the PR, the branch and the trail, never from a summary. An agent that stops without a result: the rule in SKILL.md applies first.
- Each owner returns its decisions (what, why, evidence, undo) in its reply; the PM appends them to the trail.

## 3. A fresh review on every head change

- Every new head needs its own review by a fresh agent through okay-review. Green CI is not a review, and an owner's report is not evidence.
- A head that changed only by merging the base in gets the re-check of `git diff <approved sha>..<new head>` from [../shared/review.md](../shared/review.md). It is posted as the next round. It counts toward the 3-round cap only when it raises a blocking finding.
- `ESCALATE`, or no approval after round 3: park that PR, write the escalation message from SKILL.md into the final report, and continue the others.

## 4. Merge

The PM merges, one PR at a time, in queue order, because each merge moves the base for the next one.

1. Check every condition in [../shared/autonomy.md](../shared/autonomy.md) on the current head. One fails: do not merge.
2. Merge with the commands in [../shared/git.md](../shared/git.md), pinned to the approved SHA.
3. Read the PR back (`gh pr view <n> --json state,mergedAt,mergeCommit`). A queued merge or an armed auto-merge is not a merge.
4. Add a trail line: PR, merge commit, the approval it relied on, and `undo: git revert <merge commit>`.
5. The next PR is now behind the base: its owner merges the base in, CI runs, a fresh re-check posts the new approval. Then step 1 again.

An always-pause item never happens inside the run. The sub-task that needs it is parked and listed in the report.

## 5. Keep it moving

- Wait on events: `gh pr checks <n> --watch`, or the PR subscription the harness offers. Never a sleep loop.
- At each wake, look at what each agent did (commits, pushes, comments), not at what it says. No new side effect since the last wake: replace the agent.
- A problem found on the way that supports the goal (a flaky test, a broken script) is yours: fix it in its own PR through the normal lane. It joins the queue only when the grant's scope covers it; otherwise it stops at approved.
- Stop when the exit condition holds. Never relax it to finish. A real dead end is parked with the evidence.

## Stack variant: build and verify, do not merge

Use it when the user says "don't merge", "I'll land it", or when the PRs build on each other.

- Everything above applies except step 4. The run ends when every PR is approved at its current head with green checks.
- A PR stacks only when it builds on another PR: its base is that PR's branch. All other PRs still branch off the base.
- A new head on a lower PR: the PRs above merge their parent branch in (no rebase, no force-push). Each changed head needs a fresh approval.
- After the handoff nobody pushes without the user's word. Landing is [shipping.md](shipping.md).

## Reply

The final report of [../shared/autonomy.md](../shared/autonomy.md), then delivery and reflection as usual.
