---
name: okay-perf
description: "Performance lane of the okay-* pack: speed-ups and suspected regressions backed by statistics, not eyeballed runs. Writes the claim and an end-to-end metric first, records the test platform, takes a baseline in fresh processes with varied environment size and A/B interleaved (at least 10 runs per side) because memory layout alone shifts timings by tens of percent, looks for causal impact (Coz on Linux, a manual slow-down experiment elsewhere) instead of hotspots, changes one thing at a time, and accepts it only on a statistical verdict (t-test when near-normal, rank-sum otherwise, ANOVA across a suite, p<0.05, gap above run-to-run variation, tests green; neutral means revert). Produces docs/perf/<date>-<topic>.md with a before/after table and attempt ledger, gets an independent review against the benchmark checklist, and cites the report in the PR. Use for /okay-perf <goal>, or when the user claims something is slow, faster, or regressed. Not for bug fixes, features, or UI design."
license: MIT
---

# okay-perf

Prove a performance change or a suspected regression with numbers a skeptic would accept. Rules shared with the rest of the pack live in `shared/`:

- Output and language: [shared/output-style.md](shared/output-style.md)
- Models: [shared/models.md](shared/models.md)
- Review contract: [shared/review.md](shared/review.md)
- Commit, PR, merge: [shared/git.md](shared/git.md)
- Tracker: [shared/tracker.md](shared/tracker.md)
- Repo docs layout (`docs/perf/`, `CONSTRAINTS.md`): [shared/docs-layout.md](shared/docs-layout.md)
- Contributor mode: [shared/contributor-mode.md](shared/contributor-mode.md)
- Delivery and reflection: [shared/delivery.md](shared/delivery.md)

Skill-local references, open each when its step says so:

- [method.md](method.md): harness table, layout variation, causal profiling, verdict rule, test recipes
- [templates.md](templates.md): platform spec, report, attempt ledger, PR body
- [benchmark-checklist.md](benchmark-checklist.md): the seven questions; part of the reviewer's contract

## Why this skill exists

- A program's timing depends on memory layout: link order, environment size, even the working directory length shift it by up to 40%. Thirty runs with one layout are a sample of one. A "2.8% speed-up" can be luck.
- Profilers show where time goes, not what matters. Code that runs longest may not move the metric when sped up.
- The wins found with causal profiling were tiny changes (one character in a hash function, thread counts per stage, a standard barrier instead of a hand-made one). Expect small diffs, big evidence.
- The same holds in reverse: a measured slowdown may be layout luck. Check before rolling back.

## Task list

Create this task list first. A skipped step stays on it as `skip: <reason>`.

1. Mode check
2. Claim and metric
3. Platform spec
4. Harness and baseline
5. Causal profile
6. Change (one at a time)
7. Verdict
8. Report
9. Review
10. Commit + PR
11. Deliver
12. reflect

You own the measurement and the verdict. Delegate each code change to a fresh subagent (sonnet, high; opus for cross-module work, per [shared/models.md](shared/models.md)) with a tight scope, and review its diff yourself. The reviewer in step 9 is a different agent again.

## 1. Mode check

- Contributor mode on? Apply [shared/contributor-mode.md](shared/contributor-mode.md): no `docs/perf/` file, the report goes in the MR description (Problem / Cause / Fix / Evidence), raw files stay under `.scratch/`.
- Pick the tracker from [shared/tracker.md](shared/tracker.md). Note the base branch and branch off it: `perf/<slug>` (with a tracker id when the tracker wants one).
- Read `CONSTRAINTS.md` if present: perf budgets there are the target.

## 2. Claim and metric

Before touching anything, write the claim in the words you would ship, with a number: "export is 30% faster at p50 on the 60k-row dataset".

- Metric: what the user feels, end to end. **Throughput** (units completed per second at a named progress point) or **latency** (time from a begin point to an end point, e.g. request in to response out). Total runtime only when the program is a batch job whose runtime is the product.
- Name the direction that counts as better, the target (or budget), and the dataset.
- Regression case: the claim is "commit X made metric M slower"; the baseline is the parent commit.
- Cannot name an end-to-end metric: ask the user once, with a recommended metric.

## 3. Platform spec

Fill the platform-spec block from [templates.md](templates.md) by running the commands there, not from memory. Check load with `uptime` (or Task Manager / `Get-Counter`); if the machine is busy, stop the load or say that sides are interleaved to share the noise. The spec goes at the top of the report.

## 4. Harness and baseline

Read [method.md](method.md) sections "Harness" and "Layout variation".

1. Prefer the stack's existing harness (BenchmarkDotNet, pyperf, Criterion, hyperfine) over a hand-rolled timer. Hand-roll only when none fits, and say why in the report.
2. Prove the harness before freezing it: it must reproduce the complaint on the target case, separate an easy case from a hard one, and print an error count and a work count (rows written, requests answered) so a no-op cannot pass.
3. Run every side as the product runs: release build, production flags, same data, same cache state (cold or warm, stated).
4. Take the baseline: at least 10 runs per side, each in a fresh process, with environment size varied per run, A and B interleaved. Save the raw per-run numbers.
5. Record median, p95, range, n. Record the run-to-run spread (IQR) of the baseline: the verdict needs it.

## 5. Causal profile

Read [method.md](method.md) section "Causal profiling". Find what changes the metric, not what takes the longest.

- Linux and native code: Coz with progress points on the metric.
- Anywhere else, or Coz not usable: the manual slow-down experiment.
- A plain profiler may supply candidates, but a candidate becomes a target only after a causal check. Profile in a run you do not report; profilers slow the work.
- Output: a short ranked list of candidates with the evidence for each, and the limiter (why the number is not twice as good).

## 6. Change

One change per attempt, cheapest idea first, using the performance mantras in order:

1. Do not do it (stop work nothing uses).
2. Do not do it again (cache, reuse).
3. Do it less.
4. Do it later.
5. Do it when no one is looking (off the critical path).
6. Do it concurrently.
7. Do it cheaper.

Check configuration-shaped fixes first (thread or pool sizes, a standard primitive in place of a custom one, a hash function): they are small diffs. When an earlier mantra meets the target, stop. Never stack untested changes. A change that drops work the product needs (a skipped validation, a stale cache) is a regression, not a win.

Every attempt, kept or discarded, gets a row in the attempt ledger ([templates.md](templates.md)).

## 7. Verdict

Apply the verdict rule in [method.md](method.md), same harness, same platform, same dataset, fresh layout-varied interleaved runs for the after side. Answer the seven questions in [benchmark-checklist.md](benchmark-checklist.md) with evidence from runs. Then:

| Result | Action |
|---|---|
| Faster: significant, gap above run-to-run spread, tests green | Keep. Commit this attempt alone. |
| No measurable difference (neutral) | Revert. The code does not pay for itself. |
| Slower | Revert. |
| Faster but a test is red | Revert. |
| Inconclusive (limiter unnamed, a side untuned, errors or work not checked) | Do not ship. Fix the measurement or revert. |

Regressions use the same rule before any rollback: measure the suspect against its parent with the same protocol. Roll back only on a significant slowdown above the spread. A slowdown that does not clear the rule is not evidence; report "no measurable difference" and leave the change alone.

Loop to step 6 for the next idea until the target is met or the remaining ideas are marginal. Do not relax the target to end the loop.

## 8. Report

Write `docs/perf/<YYYY-MM-DD>-<topic>.md` from the report template in [templates.md](templates.md), verdict first, with raw per-run numbers beside it (`<date>-<topic>-runs.csv`) so a reviewer can recompute the test. Contributor mode: keep the same content in the MR description and under `.scratch/`.

## 9. Review

Run okay-review (lane `perf`, opus). The reviewer is a fresh agent. Hand it:

- the diff, including the report and the raw runs file;
- the contract: the user's original request, `CONSTRAINTS.md` if present, the repo standards files, and the full text of [benchmark-checklist.md](benchmark-checklist.md) plus the verdict rule from [method.md](method.md) as the standard the method is judged against.

Never hand it your conclusions. Ask it to recompute the statistic from the raw runs, rerun a few runs of both sides, and to treat a missing answer to any of the seven questions as a finding. Rounds, fixer, 3-round cap: [shared/review.md](shared/review.md).

## 10. Commit + PR

1. One commit per accepted change, one line, `perf: <subject>` (or the repo's style). The report is its own commit: `docs: add perf report for <topic>`.
2. Push per the merge policy in [shared/git.md](shared/git.md) (L2+ rules: ask the user), then open the PR with the body in [templates.md](templates.md): one primary number, the verdict, the link to the report path.
3. Post the review comments as the PR comments. Merge only after `APPROVED` and the user's explicit approval.

No remote: commit on the branch and skip the PR (`skip: no remote`).

## 11. Deliver

Reply to the user (in Chinese, per [shared/output-style.md](shared/output-style.md)): PR link first, then the verdict line with the number, the limiter, and what was reverted. Then follow [shared/delivery.md](shared/delivery.md): write the marker and run okay-reflect.
