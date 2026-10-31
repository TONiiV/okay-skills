# Review handoff contract

## What the reviewer gets

- The artifact: the diff (`git diff <base>`, or the PR diff).
- The contract: the request or ticket as the user wrote it, the spec or issue link, and the repo standards (AGENTS.md, CLAUDE.md, CONSTRAINTS.md when present).
- Never the author's claims: no summary of what the change "does", no self-assessment, no list of tests the author says pass.

## How the reviewer reports

- Two axes, reported separately: **standards** (repo rules, smell baseline) and **spec** (does it do what the contract asks).
- Only proven findings: each one quotes the line, or shows a command that was run and its output, or a reproduction. No speculation.
- Mutation check: invert one condition the change adds and run the tests. A suite that stays green is a finding.
- Each finding is tagged `[R<round>-<n>] blocking|non-blocking`, e.g. `[R1-2] blocking: off-by-one in pageCount (quote + failing input)`.

## Approval

GitHub refuses self-approval, so approval is a PR/MR comment whose first line is `APPROVED (round <n>) at <sha>`. `<sha>` is the PR head commit the reviewer read (`gh pr view <n> --json headRefOid --jq .headRefOid`); the reviewer checks the head again just before posting and re-reviews if it moved.

- Only the reviewer posts it. The author and the fixer never post, edit, or repeat an approval.
- Any commit after `<sha>` voids the approval. Before merge, a fresh agent re-checks the new diff (`git diff <sha>..<new head>`) against the contract and, if it passes, posts a new `APPROVED (round <n>) at <new head>`. For L1 this is the post-fix check (it counts as round 2); for L2+ it is the next review round.

## Rounds

- L1: one round by a fresh sonnet reviewer that sees only the diff and the contract. One fix pass on blocking findings. No loop.
- L2+: rounds posted as PR/MR comments, answered by a separate fixer agent, until a comment starting with `APPROVED`.
- A finding still open after 3 rounds is escalated to the user in the PR/MR. The loop stops there.
- Review depth scales with the diff: add specialist checks for auth or backend changes, above 100 lines, and again above 200 lines.
