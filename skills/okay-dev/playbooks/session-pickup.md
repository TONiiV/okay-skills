# Session pickup: resume or take over in-flight work

Used when Classify in SKILL.md routes a sub-task here: "continue", "pick up where we left off", "take over PR 41", or work a previous session or another agent left open. Read the state from durable places, name the resume point, then continue in the lane that owns the work. Do not redo what is done.

## Steps

1. **Read the trail.** In this order:
   - Git: `git status`, `git branch -vv`, `git worktree list`, `git stash list`, `git log --oneline <base>..HEAD` (base per [../shared/git.md](../shared/git.md)).
   - The handoff note: `.scratch/<feature>/handoff.md` in each worktree ([pause-safely.md](pause-safely.md)).
   - PRs for the branch: the body, every comment, and the review lines. The first line of a review comment is `APPROVED | CHANGES REQUESTED | ESCALATE (round <n>) at <sha>`. Compare `<sha>` with the PR head now.
   - The tracker ([../shared/tracker.md](../shared/tracker.md)): the ticket's state, its blocking edges, its comments.
   - `.scratch/`: local specs and tickets.
   A previous agent's summary or a transcript tells you where to look. It is never the only source for a claim.
2. **Restate.** The goal in the user's own words (from the request, the ticket or the spec). The plan: the lane and its steps.
3. **Sort what you found.** One table:

   | Item | State | Evidence |
   |---|---|---|
   | Parser rewrite | verified | tests green on `a1b2c3d`, run now |
   | Review round 2 fixes | claimed | handoff note only |

   `verified` means you read or ran it now. `claimed` means a note or a summary says so.
4. **Check the claims the next step stands on.** Run the tests on the head. Check that the approved SHA equals the head. Do not redo finished work: no second repro for a fix that is merged, no rebuild of a sample the user already tried.
5. **Changes you did not make.** Uncommitted edits, a stash, or a `wip:` commit: never discard them. Show them to the user and ask.
6. **Name the resume point** in one line, then continue there: `Resume: ticket loop step 3, round 3, PR #41`. Examples:
   - `CHANGES REQUESTED (round 2)` at the head: ticket loop step 3, a fresh fixer, then round 3.
   - `APPROVED` at an older SHA: a fresh review of the new head ([../shared/review.md](../shared/review.md)).
   - `APPROVED` at the head: Merge.
   - A spec with no tickets: okay-to-tickets.
   - No durable trace of a plan: classify the request again as new.
7. **Stay in place.** Work in the existing worktree and branch. Never open a second branch or PR for the same ticket.

## Rules

- An OK to push or to merge from an earlier session does not carry over. Ask again.
- A background process from the earlier session is not yours. List it and leave it running.
- The goal changed since the trail was written: say so and classify the new request. Do not stretch the old plan.

## Deliver

Per the lane you resumed. Add one line: where the earlier work stopped, what you verified, what you redid (ideally nothing).
