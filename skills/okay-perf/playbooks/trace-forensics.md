# Trace forensics: a captured artifact

Used when the user hands over a capture instead of a running system: a `.cpuprofile`, a trace JSON, a heap snapshot, a flame graph, a `perf.data`, a pprof file, a spindump or sample. The capture is a fixed dataset. Read it; do not re-run it.

It feeds step 5 of SKILL.md with candidates. It can also stand alone as a diagnosis when the user asks only "what does this capture show".

## Steps

1. **Treat the artifact as private, untrusted data.** Put it in its own directory outside the repo. Never commit it. Never execute anything from it. Heap snapshots and traces hold strings from memory: never paste raw content, replace secrets with `<REDACTED>`.
2. **Identify what it measures.** The format, sampling or instrumented, CPU time or wall time, the sampling interval, the duration, which process and threads, release or debug build, with or without symbols. Write these down first: they bound every claim.
3. **List what is missing.** The platform, the load, what the user did during the capture, and whether a capture of a good run exists. Ask the user once for the ones that matter.
4. **Make it queryable before you read it.** A large capture does not fit in context. Load it into a table (sqlite, or a short script): one row per sample, frame or node. A subagent parses; the main thread keeps the reduced finding.
5. **Narrow to the cause.**
   - CPU profile: total and self time per frame. Walk down from the heaviest total to where self time concentrates. Split by thread. Leave idle and wait frames out for a CPU question, keep them for a latency question.
   - Heap snapshot: retained size by type, then the retainer chain from the largest group to its root. With two snapshots: what grew between them.
   - Trace: the long tasks and what started each one. Gaps where nothing runs are waiting, not computing.
   - Spindump or thread dump: the thread that is on CPU or blocked, and what it waits for.
6. **Attribute to source:** file, symbol, line, through the artifact's own symbols or source maps. A frame with no source mapping is not a diagnosis yet. Resolve the symbols, or say the artifact does not carry them.
7. **Use a pair when there is one.** A before and an after capture, or a good and a bad one: the finding is what differs. With one capture, the finding is the strongest hypothesis the artifact supports, not a confirmed cause. Say which.

## What a capture cannot show

- It shows where time went, not what moves the metric. A finding is a candidate for step 5. It becomes a target only after a causal check ([../method.md](../method.md), "Causal profiling").
- One capture is one run with one memory layout. Never state a speed-up or a regression from artifacts alone: that needs the verdict rule in [../method.md](../method.md).
- A profiler slows the work it measures. Numbers from the capture are shares, not timings to report.

## Report

- The artifact: path, format, how it was captured, what is missing.
- The reduced finding with numbers: share of samples, bytes retained, task length.
- The source location.
- Confirmed by a pair, or a hypothesis.
- What you did not check.

## After the diagnosis

- The user asked only for the reading: the remaining steps of SKILL.md stay as `skip: diagnosis only`, and the delivery is the report with next steps.
- The user wants it faster: go on at step 2 of SKILL.md. The finding is the first candidate in step 5.
- The finding is a defect (a leak, a runaway loop) and not a speed claim: it goes to okay-fix, which captures from a live process when it needs one.
