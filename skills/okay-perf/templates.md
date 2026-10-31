# Templates

## Platform spec

Capture it by running commands, not from memory. Paste it at the top of the report. Two numbers are comparable only when these match.

| Field | Value | How to get it |
|---|---|---|
| CPU model, cores, threads | | `lscpu` / `sysctl -n machdep.cpu.brand_string hw.ncpu` / `Get-CimInstance Win32_Processor` |
| Frequency policy | governor or power plan, turbo on or off, AC or battery | `cpupower frequency-info` / `powercfg /getactivescheme` / `pmset -g` |
| RAM | size, speed | `free -h` / `sysctl hw.memsize` / `Get-CimInstance Win32_PhysicalMemory` |
| OS and kernel | name, version | `uname -a` / `winver` |
| Virtualization | bare metal, VM, container, WSL | |
| Runtime and compiler | name and exact version | `node -v`, `python -V`, `rustc -V`, `dotnet --version`, `gcc --version` |
| Build type and flags | release, `-O2`, LTO, PGO, GC mode | the build file or command line |
| Code under test | git commit of each side | `git rev-parse --short HEAD` |
| Dataset | name, size, source, seed | |
| Cache state | cold or warm, how it was set | |
| Background load | load average before and during, what was stopped | `uptime` / Task Manager / `Get-Counter '\Processor(_Total)\% Processor Time'` |
| Harness | tool, version, command line | |

## Report template

File: `docs/perf/<YYYY-MM-DD>-<topic>.md`. Raw per-run numbers: `docs/perf/<YYYY-MM-DD>-<topic>-runs.csv` with columns `side,run,env_pad_bytes,metric,errors,work_done`.

```markdown
# <Topic>: <one-line claim result>

**Verdict:** <Faster | Slower | No measurable difference | Inconclusive>, <primary number with unit, e.g. p50 41 ms -> 33 ms (-20%)>, <test name> p = <value>, n = <per side>. <Keep | Revert>.

## Claim

<The claim as shipped, with a number. Metric: throughput or latency at <progress point / begin and end points>. Direction, target, budget from CONSTRAINTS.md if any.>

## Platform

<Platform-spec table, filled.>

## Method

- Harness and command: <...>
- Runs: <n> per side, fresh process each, environment padded 0-4096 bytes at random, A/B interleaved
- Cache state: <cold|warm>
- Correctness gate: <test command>, <result>
- Error count and work done: <before/after>

## Results

| Variant | n | Median | p95 | Range (min - max) | Test | p |
|---|---|---|---|---|---|---|
| Baseline (<commit>) | | | | | | |
| After (<commit>) | | | | | <Welch t / rank-sum> | |
| Gap | | <median diff, %> | | baseline IQR <value> | | |

p95 with fewer than 20 runs is about the maximum; marked as such.

<Suite claim: one ANOVA line with its p-value, and the per-benchmark table below it.>

## Causal profile

<Tool: Coz on Linux | manual slow-down experiment. Progress points used. Ranked candidates with predicted gain against measured gain. The limiter: why the metric is not twice as good.>

## Attempt ledger

| # | Idea (mantra) | Baseline -> result | Verdict | Why |
|---|---|---|---|---|
| 1 | | | kept / reverted | |

## Limits

<What this does not show: other platforms, other datasets, tail beyond n, what was not checked.>
```

The report leads with the verdict, then the number, then the evidence. "Inconclusive" names the gap that makes it so.

## PR body

Follows [shared/git.md](shared/git.md): Problem / Cause / Change / Evidence / Not touched / Risks, at most 300 words.

- Problem: the claim and the metric.
- Cause: the limiter the causal profile found.
- Change: the accepted changes, one line each.
- Evidence: the verdict line (one primary number, test, p, n), the link to `docs/perf/<date>-<topic>.md`, and at most five ledger rows (kept and reverted). The full ledger lives in the report.
- Not touched: what stayed out, including ideas reverted as neutral.
- Risks: platform and dataset the result is limited to.
- Contributor mode: Problem / Cause / Fix / Evidence, with the report inline instead of a link.
