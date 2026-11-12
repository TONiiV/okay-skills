# Pause safely: stop so the work can be resumed

Used when Classify in SKILL.md routes a sub-task here: the user says pause, stop for now, or continue tomorrow, or the session is about to end. Only on an explicit signal. "Keep going" is not a pause.

## Steps

1. **Stop at a boundary.** Finish the current step or back out of it. Start nothing new.
2. **Leave no half-applied state.**
   - `git status` shows a merge, rebase or cherry-pick in progress: finish it or abort it.
   - A migration or a generated-file build that ran halfway: complete it or revert it.
   - What you cannot finish or revert goes into the note under In flight, with the exact state.
3. **Stop your agents.** For each one, record its last commands (see "An agent that stops without a result" in SKILL.md).
4. **Stop your background processes** by the PID you recorded when you started them. Never by a name or path pattern. A process you did not start stays running and is listed in the note.
5. **Make the work durable, and say so.**
   - Uncommitted edits on a task branch: one commit, `wip: <subject>`, one line. Never on the base branch.
   - The tree does not build or a test is red: the note says which.
   - Never `git stash`: a stash is not on the branch and the next reader does not see it.
   - Nothing silent: every commit you made to pause is listed in the reply with its SHA.
6. **Push only what the user already OK'd** ([../shared/git.md](../shared/git.md)): a branch covered by the batch OK may be pushed. Anything else stays local, and the reply says "local only". A `wip:` commit on a PR voids its approval ([../shared/review.md](../shared/review.md)). No new PR, no merge, no tracker comment to pause.
7. **Write the handoff note** (below).
8. **Reply:** where the work stopped, the commits made, pushed or local only, the note's path, and the first resume command as the next step ([../shared/delivery.md](../shared/delivery.md)). The task is not delivered: write no reflection marker, and leave `reflect` open on the task list.

## Handoff note

Path: `.scratch/<feature>/handoff.md`, inside the worktree of the task branch, untracked.

Why there: the next agent starts in that worktree and reads files before anything else. An untracked file cannot land in a PR. A chat summary ends with the session. It is the same place local specs and tickets use.

Keep it out of git once (in a worktree the exclude file is in the common git dir):

```sh
ex="$(git rev-parse --git-common-dir)/info/exclude"; grep -qxF '.scratch/' "$ex" || echo '.scratch/' >> "$ex"
```

The worktree will be removed, or this is a cloud session where untracked files are lost: also paste the full note in the reply.

```md
# Handoff: <feature>, <UTC date and time>

## Goal
<the request in the user's words; links to the ticket, spec, PR>

## Done and verified
<item: the command you ran and its result, or the SHA>

## Done, not verified
<item: why it is unchecked>

## In flight
<branch, worktree path, head SHA, pushed or local only; wip commits; anything half-applied>

## Next step
<lane and step, e.g. "ticket loop step 3, round 2, PR #41", and the first action>

## Open questions
<each decision that waits for the user>

## Resume
<exact commands: cd to the worktree, install, the test command, the dev server command>
```

No secrets in the note. Refer to a key by its variable name.
