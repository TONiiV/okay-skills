---
name: okay-review
description: "Independent reviewer used by every lane of the okay-* pack. Takes a PR/MR number or a base..head range plus the contract (request, spec or issue links, repo standards), lane and round. A fresh agent reviews the artifact and the contract only, never the author's claims, on two separate axes (standards with a smell baseline; spec), runs a mutation check, keeps only proven findings, and scales depth with diff size and risk (security, simplification, adversarial, Codex for L4). Posts exactly one PR/MR comment tagged [R<n>-<k>] blocking|non-blocking, or one starting with APPROVED, and returns the verdict to the caller. L1: one sonnet round plus a post-fix check. L2+: opus rounds, 3-round cap. Use for /okay-review <PR> or when another okay-* skill needs a review. Does not write fixes."
license: MIT
---

# okay-review

Review one change in a fresh agent and post the result. You report; you never fix. Rules shared with the rest of the pack live in `shared/`:

- Handoff, finding format, approval, rounds: [shared/review.md](shared/review.md) (the contract for this skill; read it first, it is not restated here)
- Models: [shared/models.md](shared/models.md)
- Output and language: [shared/output-style.md](shared/output-style.md)
- Commit, PR, merge: [shared/git.md](shared/git.md)
- Tracker and code host: [shared/tracker.md](shared/tracker.md)
- Contributor mode: [shared/contributor-mode.md](shared/contributor-mode.md)

Reviewer prompts, the smell baseline and the specialist briefs are in [briefs.md](briefs.md).

## Inputs

The caller passes:

| Input | Notes |
|---|---|
| Target | A PR/MR number, or a `base..head` range. Missing: ask once. |
| Contract links | Request as the user wrote it, spec/issue/ticket links. Fetch them yourself. |
| Lane | L1, L2, L3, L4, L5 or perf. Picks the mode. |
| Round | 1 to 3. Default 1. |
| Blocking list | Post-fix check only (L1): the open `[R1-<n>]` blocking findings. |

If the caller hands you a summary of what the change does, a self-assessment, or a list of passing tests, drop it. Do not forward it to any reviewer.

## Steps

1. **Pin the artifact.** PR/MR: `gh pr diff <n>` or `glab mr diff <n>`. Range: `git diff <base>...<head>`. Run `git add -N .` first when reviewing a working tree. Confirm the diff is non-empty; stop and tell the caller if it is empty. Measure changed lines (added + removed) and list touched paths.
2. **Assemble the contract.** The request text, the fetched spec or issue, and the repo standards files that exist (AGENTS.md, CLAUDE.md, CONSTRAINTS.md). No spec found: the spec axis reports "no spec available" and the comment says so.
3. **Pick the mode and depth** (below).
4. **Spawn fresh reviewers in parallel**, each with the artifact and the contract only, using the prompts in [briefs.md](briefs.md). Never pass the CLAIM (what the author or you think the change achieves).
5. **Verify.** Rerun every command a finding cites. Keep a finding only when the output shows the failure, or the quoted line contradicts a quoted contract line. Drop the rest and merge findings that share a root cause. Add no finding of your own.
6. **Post exactly one comment** (below) and return the verdict.

## Modes

| Lane | Reviewer | Rounds |
|---|---|---|
| L1 | Fresh sonnet, high effort. Diff and contract only. | One review round, then a post-fix check: a fresh sonnet gets the new diff and the listed blocking findings only and answers resolved yes/no with evidence for each. No second full review. |
| L2, L3, L4, L5, perf | Fresh opus, high effort. | Round 1 to 3. The reviewer's tier is never below the implementer's. |

- The fixer is a separate fresh agent, not the reviewer and not the author's context. The caller dispatches it with the findings; you do not.
- Round 3 with a blocking finding still open: the verdict is `ESCALATE`. Say so in the comment and name the open findings for the user. The loop stops.
- Round 2 and 3 reviewers are fresh agents too. They get the new diff, the contract, and the previous round's finding list so they can mark each `resolved` or `still open`; they re-review the whole diff, not only the findings.

## Depth

Count changed lines on the full diff. Each pass is one more fresh agent with its own brief in [briefs.md](briefs.md). Passes not run are listed in the comment as `skip: <reason>`.

| Condition | Added pass |
|---|---|
| Under 50 changed lines | None. The two axes only. |
| Auth, session, token, permission, payment or data-deletion code touched (any size), or backend changes over 100 lines | Security |
| Over 100 lines | Simplification |
| Over 200 lines, or the previous round had a critical finding (security hole, data loss, broken core behaviour) | Adversarial (interrogate) |
| Lane L4 and the codex plugin is available | Codex cross-family pass: send the artifact and contract to Codex through the plugin's `codex:rescue` subagent with the adversarial brief, and ask for a read-only run: no `--write`, and the request says Codex must not edit the tree. Plugin missing or errored: `skip: codex unavailable`, never block. |

## Comment

Post one comment per invocation. Its first word is the verdict.

```
APPROVED | CHANGES REQUESTED | ESCALATE: R<round>, lane <lane>
Depth: <passes run>; skip: <passes not run and why>

## Standards
[R<round>-<k>] blocking|non-blocking: <finding with quote or command + output>
(or: no findings)

## Spec
[R<round>-<k>] blocking|non-blocking: <finding>
(or: no findings; or: no spec available)

## Mutation check
<mutation applied, command, result; or skip: <reason>>

## Safety fact
<the one fact the change is safe because of, and how it was established: stated / line / walked / ran / reproduced>
```

- `APPROVED` only when no blocking finding is open. Non-blocking findings may ride along.
- Post with `gh pr comment <n> --body-file <file>` or `glab mr note <n> -m`. Use a file for the body so quotes and backticks survive.
- No PR/MR yet (a bare range): do not post; return the comment body to the caller, who posts it once the PR exists, and say `posted: no`.
- Contributor mode: do not post to the MR unless the user asks; return the comment body to the caller.
- No AI attribution in the comment.

## Return to the caller

Reply with: the verdict word, the comment URL (or `posted: no`), the open blocking findings (`[R<n>-<k>]` plus one line each), and the count of non-blocking findings. Nothing else; the caller decides on the fixer, the merge and the escalation.
