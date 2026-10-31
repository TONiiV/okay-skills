---
name: okay-fix
description: "L1 lane of the okay-* pack: small fixes and bug fixes. Reproduces the bug, fixes it at the root cause with a regression test, checks the L1 threshold (escalates if exceeded), gets one fresh-agent review of the diff, commits one line, and opens a PR that auto-merges on APPROVED + green CI when the merge allow rule is set (otherwise stops at APPROVED and hands the merge to the user). Use for /okay-fix <bug>, or when the user reports something broken, throwing, or wrong that looks small (a few lines, at most 2 files). Not for new features, architecture, UI design, or performance work."
license: MIT
---

# okay-fix

Fix one small bug end to end. Rules shared with the rest of the pack live in `shared/`:

- Output and language: [shared/output-style.md](shared/output-style.md)
- L1 threshold and escalation: [shared/lanes.md](shared/lanes.md)
- Models: [shared/models.md](shared/models.md)
- Review contract: [shared/review.md](shared/review.md)
- Commit, PR, merge: [shared/git.md](shared/git.md)
- Tracker: [shared/tracker.md](shared/tracker.md)
- Contributor mode: [shared/contributor-mode.md](shared/contributor-mode.md)
- Delivery and reflection: [shared/delivery.md](shared/delivery.md)

Be scientific: every shipped line traces to runtime evidence. A change that "might help" is a hypothesis, not a fix, and does not ship.

## Task list

Create this task list first. A step you skip stays on it as `skip: <reason>`.

1. Mode check
2. Reproduce
3. Root cause
4. Fix + regression test
5. L1 threshold check
6. Review
7. Commit + PR
8. Merge
9. Deliver
10. reflect

## 1. Mode check

- Contributor mode on? Apply [shared/contributor-mode.md](shared/contributor-mode.md) for the rest of the task.
- Pick the tracker from [shared/tracker.md](shared/tracker.md).
- Note the base branch (per [shared/git.md](shared/git.md)) and branch off it: `fix/<slug>`.

## 2. Reproduce

Build a feedback loop before reading code for a theory. It is one command that:

- drives the real code path and asserts the user's exact symptom (red now, green once fixed);
- gives the same verdict every run (a flaky bug needs a pinned, high reproduction rate);
- runs in seconds, unattended.

Try in order: a failing test at the nearest seam, a CLI call with a fixture, a curl against a dev server, a headless browser script, a throwaway harness, a bisect script. Run it, show the command and its red output with secrets replaced by `<REDACTED>`. Shrink the repro until every remaining part is load-bearing.

Cannot build a loop: stop, list what you tried, and ask the user for access, a redacted artifact, or permission to instrument. Do not guess a fix.

## 3. Root cause

1. Write 3-5 ranked, falsifiable hypotheses: "If X is the cause, changing Y makes the bug disappear."
2. Test one variable at a time. Tag temporary logs `[DEBUG-<4 hex>]` so cleanup is one grep.
3. Confirm the surviving mechanism with runtime evidence.
4. Before editing a function, grep every caller of it. Fix it once where all callers route through, not only on the path the report names.

## 4. Fix + regression test

1. If a correct seam exists (the test exercises the real bug pattern as it happens at the call site), turn the minimal repro into a failing test and watch it fail.
2. Apply the smallest fix the evidence justifies.
3. Watch the test pass, then re-run the original loop from step 2.
4. No correct seam: write that down for the PR body. It is a finding, not a skip.
5. Remove every `[DEBUG-` line and throwaway file. Run the repo's test suite.

## 5. L1 threshold check

Measure the whole diff as [shared/lanes.md](shared/lanes.md) says. Any condition exceeded: stop, send the escalation message from that file with the condition and the measured value, and end the task there. No commit, no PR, no merge.

## 6. Review

One round, by a fresh subagent on the sonnet tier with high effort, separate from you. Give it only:

- the diff: the output of `git add -N . && git diff <base>`;
- the contract: the bug report in the user's own words, the repro command, and the repo standards files (AGENTS.md, CLAUDE.md, CONSTRAINTS.md when present).

Never give it your explanation, your hypotheses, or your claims about what passes. Use this prompt:

```
You review one small bug fix. You get the diff and the contract only.
Report on two axes, separately: standards (repo rules, smells) and spec (does the diff fix the reported bug at its root cause, with a regression test where a seam exists).
Report only findings you proved: quote the line, or show a command you ran and its output.
Invert one condition the diff adds and run the tests; a suite that stays green is a finding.
Tag each finding [R1-<n>] blocking|non-blocking.
If there is no blocking finding, your reply starts with APPROVED.
```

Then:

1. No blocking finding: keep the reply as the approval.
2. Blocking findings: make one fix pass on them, re-run the tests and the step 5 check. Then give a fresh sonnet subagent the new diff plus the blocking findings only, and ask whether each one is resolved (yes/no with evidence). All yes: that reply, starting with `APPROVED`, is the approval. Any no: do not merge; open the PR, post the open findings, and escalate to the user.
3. There is no second review round.

## 7. Commit + PR

1. Commit with one line, no body, no trailer: the repo's style, else `fix: <subject>`.
2. Push the branch: with the merge allow rule the L1 merge policy covers the push; without it, ask the user before pushing. Then open the PR with the body from [shared/git.md](shared/git.md). Evidence holds the repro command with its red-then-green output; Cause names the hypothesis that held.
3. Post the reviewer's findings as a PR comment with their `[R1-<n>]` tags, then the approval as a separate comment starting with `APPROVED`.

No remote: commit on the branch and skip the PR (`skip: no remote`). Contributor mode: open an MR with the Problem / Cause / Fix / Evidence description and skip step 8.

## 8. Merge

Follow the merge policy in [shared/git.md](shared/git.md). With the allow rule: auto-merge on `APPROVED` + green CI. Without it: stop at `APPROVED` and hand the PR link to the user to merge. Never merge without the `APPROVED` comment.

## 9. Deliver

Reply to the user (in Chinese, per [shared/output-style.md](shared/output-style.md)): PR link first, then what was broken, the root cause, the fix, and the red-then-green repro output. Then follow [shared/delivery.md](shared/delivery.md): write the marker and run okay-reflect.
