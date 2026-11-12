# Multi-phase plan: work across phases or stacked PRs

Used when Classify in SKILL.md routes a sub-task here: one outcome needs several PRs that land in order, such as a migration (add the new path, move the callers, delete the old path) or a rollout. The plan is the deliverable. Building starts only on the user's go.

A change of one or two files with an obvious approach needs no plan: say so and classify it into a lane.

This playbook adds only the phase cut. The spec is written by okay-to-spec, the tickets by okay-to-tickets, and each phase runs through the throughput checkpoint and the ticket loop in SKILL.md.

## Steps

1. **Name the end state.** What is true when everything has landed, in terms someone can observe. What is out of scope.
2. **Settle the open decisions first.** A hard-to-reverse choice goes to okay-think. A question a run can answer goes to okay-prototype. The plan holds no guess.
3. **Cut the phases.** Each phase:
   - ends in a check someone can run: a test, a command, a measured number;
   - leaves the base branch working and releasable when it merges alone;
   - is small: every PR in it is S or M ([../shared/lanes.md](../shared/lanes.md)).
   For a replacement, use three kinds of phase: add the new path beside the old one, move the callers, delete the old path. The deletion is the last phase and its own PR.
4. **Order by blocking edges.** Draw an edge only where one phase needs code from another. Phases with no edge between them run in parallel.
5. **One PR per phase.** A phase with independent tickets gets one PR per ticket.
   - A PR is stacked only on the PR it builds on: its base is that branch. Every other PR is based on the base branch.
   - Keep a stack short. It merges from the bottom up.
   - After the parent merges: point the child at the base branch and merge the base into it. No rebase, no force-push ([../shared/git.md](../shared/git.md)). The head moved, so the child needs a fresh approval ([../shared/review.md](../shared/review.md)).
6. **Write it down once.** Run okay-to-spec: the spec carries the end state, the phase table and what is out of scope. Then okay-to-tickets: one ticket per PR, the plan's edges as blocking edges, the phase in the title (`P2: move the importers`). No second plan file beside the tracker.
7. **Show the plan and stop.** Ask once for the go. The delivery is the spec link.

   | Phase | Outcome | Check | PR base | Blocked by |
   |---|---|---|---|---|
   | P1 | New store behind the old interface | `npm test -- store` | base | none |
   | P2 | Importers read the new store | import fixture gives the same rows | base | P1 |
   | P3 | Old store deleted | `git grep OldStore` prints nothing | base | P2 |

## Running the plan

1. One phase is one batch: its throughput checkpoint, then the ticket loop. The checkpoint's blocking first steps are the tickets that gate this phase.
2. The next phase starts when the check of the phase before it passes on the base branch (on the parent branch for a stacked PR).
3. A phase taught you something that changes a later phase: update the spec and the tickets, and tell the user in one line. Never drift from the written plan in silence.
4. A check fails after merge: stop the phases that depend on it. Fix forward or revert that phase, then go on.
