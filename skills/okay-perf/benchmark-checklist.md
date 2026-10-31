# Benchmark checklist

Answer each question with evidence from a run, not a guess about the code. The implementer answers them before the report; the okay-review reviewer receives this file as part of its contract and treats an unanswered or unsupported question as a finding.

## Before the first run

- The claim is written in the words that would ship, with a number and a metric ("export is 30% faster at p50 on the 60k-row dataset"). The questions test that sentence.
- The measurement script was read: what it times, counts and ignores.
- Machine load checked (`uptime`, core count). If it is busy and cannot be stopped, the sides are interleaved and the report says so.
- A single quick run is a ballpark only. Say "one run", and still answer questions 4 and 7. A choice between options is never a ballpark.

## The seven questions

1. **Why not double?** The limiter is named, measured in a run that is not reported (profilers slow the work): CPU per process, a runtime profiler, I/O wait, syscalls, the load generator's own CPU. If a change did not move the number, the limiter says why.
2. **Was it tuned?** Every side runs the way production runs: release build, production flags, batching, pools, cache state, same versions and data. A limiter that is a setting (debug build, a commit per row, a missing index) means that side is untuned: tune and measure again. Cannot tune it: do not pick a winner.
3. **Did it break limits?** Arithmetic: bytes per second against disk and network, operations times cost against cores, time saved against the share of the run the changed piece takes. Removing a piece that takes 10% of the run makes the run at most about 11% faster. A result past a limit measured something other than the work.
4. **Did it error?** Failures and non-success responses are counted; outputs are correct, not just present. Rejections are fast, timeouts slow.
5. **Does it reproduce, across layouts?** Each side: at least 10 runs, each in a fresh process, environment size varied per run, A and B interleaved. Median, p95 and range reported. The statistical test named, with p-value (t-test when near-normal, rank-sum otherwise, ANOVA across a suite). The median gap exceeds the baseline's run-to-run spread. One process and one layout repeated is a sample of one.
6. **Does it matter?** The end-to-end path a user waits on was measured next to any micro result, with realistic sizes and concurrency. The micro result is stated as a share of the whole.
7. **Did it even happen?** The work ran inside the timed region: requests reached the server, rows were written, bytes were read, results were used. Lazy code, discarded results and timeouts produce numbers for work that never happened.

## Report rules

- Lead with the verdict: faster, slower, no measurable difference, or inconclusive.
- Give the number with its unit, run count, range and limiter.
- Inconclusive when a difference is claimed but the limiter is unnamed, a side ran untuned, or questions 4 and 7 could not be checked. Name the gap.
- Same conditions before and after; cold and warm cache are different experiments.
- Neutral means revert. Correctness gates the metric: green tests, same work done.
- Every attempt, kept or reverted, is in the ledger.
- A PR body carries one primary number; the rest lives in the report.

## Reviewer red flags

- The after numbers come from a different session or machine state than the baseline.
- p-value missing, or "looks faster" with no test.
- A significant result smaller than the baseline's run-to-run spread, kept.
- Several changes measured as one.
- A test changed, skipped or deleted to make the change pass.
- Total runtime reported for a latency or throughput claim.
- Raw per-run numbers absent, so the statistic cannot be recomputed.
