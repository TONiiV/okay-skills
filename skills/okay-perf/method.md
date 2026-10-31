# Method

## Harness

Use the stack's own harness. It already captures environment, warmup and statistics; hand-rolled timers get these wrong.

| Stack | Harness | Use it for | Watch out |
|---|---|---|---|
| .NET | BenchmarkDotNet | Micro and component benchmarks | Several launches, not one: `--launchCount 10` (or `[SimpleJob(launchCount: 10)]`), so each launch is a fresh process with its own layout. Compare sides with its statistical-test option (`--statisticalTest`, Mann-Whitney). Release build only. |
| Python | pyperf | Micro and component benchmarks | It spawns worker processes (`--processes`, default 20), which gives fresh layouts. Compare with `python -m pyperf compare_to a.json b.json`. Do not benchmark with `timeit` loops in one process. |
| Rust | Criterion | In-process micro benchmarks | One process means one layout. Run the bench binary at least 10 times with different environment sizes and keep per-run results; do not trust a single run's "change detected". |
| Any CLI or end-to-end command | hyperfine | Whole-program and end-to-end runs | `--warmup`, `--runs`, `--export-json`. It runs one command's runs in a block, so A and B are not interleaved: drive it from a loop that alternates blocks (see below), or run each pair with `--runs 1`. No p-value: run the test yourself on the exported times. |
| Server, latency or throughput | The service's own load tool (wrk, k6, ab, a repo script) | Throughput at a progress point, latency | Watch the load generator: if it saturates first, you measured it. Count errors and non-success responses. |
| None of the above | A small script in the repo's language | Last resort | Say why in the report. Time only the work, count errors and work done, discard warmup, report every run. |

Harness rules, whatever the tool:

1. The harness must print an error count and a count of work done. A fast result with zero work is not a result.
2. Same command, same dataset, same cache state for both sides. Say whether it is cold or warm. A cold baseline against a warm result measures the cache.
3. Production build and flags on both sides. A side on defaults means you compared configurations.
4. Freeze the harness before the first change. Changing it later restarts the baseline.

## Layout variation

Why: code, stack and heap placement change with link order, environment variables (the current directory path is one of them), and any allocation change. They hit cache sets, the branch predictor and the TLB. 30 runs of one layout vary only by noise like daemons waking; they do not sample layouts. A tool like Stabilizer re-randomizes layout inside the run (LLVM, C/C++), which makes times near-normal. Without such a tool, approximate it from outside:

1. Every run is a fresh process.
2. Vary the environment size per run, by padding an unused variable by a random 0 to 4096 bytes. Where it is cheap, also vary the working-directory path length and, for native code, link order.
3. Interleave: A, B, A, B, ... so drift, thermal state and background load hit both sides equally.
4. At least 10 runs per side. For p95, at least 20 (with fewer, p95 is about the max; say so).
5. Keep every raw time.

Interleaved driver (bash; adapt `A` and `B` to the two builds):

```sh
for i in $(seq 1 12); do
  for side in A B; do
    pad=$(( RANDOM % 4096 ))
    env PAD="$(head -c "$pad" /dev/zero | tr '\0' x)" \
      hyperfine --runs 1 --warmup 0 --export-json "run-$side-$i.json" "./bin-$side <args>"
  done
done
```

PowerShell: same loop, `$env:PAD = 'x' * (Get-Random -Max 4096)` before each call.

The after side is measured the same way, fresh, at verdict time. Never compare a new run against a baseline taken in another session.

## Causal profiling

A profiler lists where time is spent. That is not where speed-ups pay: code that runs longest may not be on the path that limits the metric, and modern programs are concurrent and asynchronous.

### Progress points

Mark what the metric counts:

- **Throughput:** one progress point where a unit of work completes. Count per second.
- **Latency:** a begin point and an end point around the transaction. The harness tracks how many transactions are in flight; by Little's law, latency = average number in the system / throughput, so latency follows from the same counters.

### Coz (Linux, native code)

Coz does virtual speed-ups: to ask "what if line L were 20% faster", it slows every other thread by the matching amount and measures the effect on the progress-point rate. It prints a causal profile: per line, the predicted overall speed-up against the local speed-up.

```sh
# build with debug info (-g); add progress points in code: COZ_PROGRESS, or COZ_BEGIN("name") / COZ_END("name")
coz run --- ./bin-A <args>        # writes profile.coz; open it in the Coz plot viewer
```

Read the result:

- A steeply rising line: speeding that code up pays. Start there.
- A flat line: speeding that code up changes nothing, however hot it looks in a profiler. Do not touch it.
- A falling line: speeding it up makes the program slower (contention on a lock, disk or network). Avoid.
- No progress points: Coz only gives end-to-end runtime. Add them.

Coz predicts; the verdict step still measures. Compare the predicted gain with the measured gain and note both in the report.

### Manual slow-down experiment (macOS, Windows, no Coz, non-native runtimes)

Use the same idea by hand. For each candidate component X (from a profiler, a trace, or reading the pipeline):

1. Add a controlled delay inside X (spin or sleep, `0%`, `5%`, `10%`, `20%` of X's per-call time), behind an environment flag so the code is not shipped.
2. Measure the metric at each delay with the full protocol above (fresh, layout-varied, interleaved, at least 10 runs per level).
3. Fit the slope. Metric drop close to the added time on the critical path: X is limiting, speeding it up pays about that much. Flat: X is not limiting, leave it. Where stages run concurrently, slow the other stages instead of X to get the true virtual speed-up (the Coz trick), when it is cheap to do.
4. Remove the instrumentation before the real change.

Record the slope table in the report. This costs 3 to 4 times the runs of one baseline per candidate; limit it to the top 2 or 3 candidates.

## Verdict rule

Decide before looking at the after numbers: the metric, the direction, the `alpha = 0.05`, and the correctness gate (the repo's tests).

1. **Pick the test.**
   - Two sides, times near-normal (many layouts or long runs, a Q-Q plot or a Shapiro-Wilk test does not reject, no heavy tail): Welch's t-test.
   - Skewed, bimodal, tiny n, or a tail metric: rank-sum (Mann-Whitney U).
   - A suite of benchmarks judged together (a claim about "the build" or "the flag"): one ANOVA across the suite, with the benchmark as a factor, e.g. `summary(aov(time ~ benchmark + variant, data))` in R. Per-benchmark tests alone invite eyeballing and false positives: with 30 benchmarks, some will show effects by chance.
2. **Significance:** reject "no difference" only when `p < 0.05`. A p of 0.26 means about one experiment in four shows this much by chance: that is noise, not a small win.
3. **Size:** the gap between medians must exceed the run-to-run spread of the baseline (IQR). A significant but tiny gap that sits inside the spread is not a result worth code.
4. **Correctness gates the metric:** the full test suite stays green and the error and work counts match the baseline. Red tests or less work done: not a win.
5. **Neutral means revert.** Not significant, or inside the spread: revert the change. Kept code is maintained forever; make it pay.
6. **Regressions use the same rule.** Measure the suspect and its parent with the same protocol. Only a significant slowdown above the spread justifies a rollback. Otherwise report "no measurable difference"; the change may have moved layout, not performance.
7. **Inconclusive** is a verdict: no named limiter, a side untuned, errors or work not checked, or the platform changed mid-experiment. Do not ship on it.
8. **One metric, one test.** Pick the primary metric first. Report secondary metrics as context, not as extra chances to find p < 0.05.

Recipe (Python, scipy; `a` and `b` are the raw per-run times):

```python
import numpy as np
from scipy import stats
a, b = np.loadtxt("a.txt"), np.loadtxt("b.txt")
normal = stats.shapiro(a).pvalue > 0.05 and stats.shapiro(b).pvalue > 0.05
res = stats.ttest_ind(a, b, equal_var=False) if normal else stats.mannwhitneyu(a, b)
iqr = np.subtract(*np.percentile(a, [75, 25]))
print("test", "welch" if normal else "rank-sum", "p", res.pvalue,
      "median gap", np.median(a) - np.median(b), "baseline IQR", iqr,
      "p95", np.percentile(a, 95), np.percentile(b, 95), "n", len(a), len(b))
```

Faster means `p < 0.05` and the median gap above the IQR in the right direction. Put the test name, the p-value and the numbers in the report.

## Kept or reverted: log it

A reverted idea leaves no trace in git, so the same dead end gets retried. Every attempt, kept or discarded, is a row in the attempt ledger in the report ([templates.md](templates.md)). Read the ledger before proposing the next idea.
