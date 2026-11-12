# Runtime forensics: a symptom that lives in a running process

Used from steps 2 and 3 of SKILL.md when the symptom shows only in a live process and no test reproduces it yet: memory that grows, CPU that spins while idle, a visual glitch or stutter, a hang. Instrument the process and capture what it does. Do not reason from the source alone.

The deliverable is a diagnosis: the first wrong state, the proof, and the source line. It is not a fix.

## Steps

1. **Name the symptom as a number.** "RSS grows 40 MB per hour with no traffic", "one core at 100% with no input", "a frame takes 120 ms on scroll". Say what the healthy value is.
2. **Pick a safe target.** A local or staging process you started, with its PID recorded. Production, or a process the user is working in: ask first, because attaching a debugger can pause it. Never restart a process you did not start.
3. **Capture a healthy run and a symptom run** with the same tool:

   | Symptom | Capture |
   |---|---|
   | Leak | Two or three heap snapshots, the same action repeated between them. The growth is the difference. |
   | Idle CPU spin | A CPU profile over an idle window, plus a thread or stack dump |
   | Glitch, stutter | A trace or timeline recording around the action |
   | Hang | A stack dump of every thread, taken twice a few seconds apart |

   Use the runtime's own tools, for example: Node `--inspect`, `--cpu-prof`, `--heapsnapshot-signal`; Python `py-spy dump` and `py-spy record`; JVM `jcmd <pid> Thread.print` and `GC.heap_dump`; Go `pprof`; native `perf record` or a debugger backtrace of all threads; a browser's Performance and Memory panels.
4. **Keep captures out of git.** Save them outside the repo or under `.scratch/`. They can hold secrets and user data: never commit them, never paste raw content, replace secrets with `<REDACTED>`.
5. **Reduce to the smoking gun.** Parse a large capture in a subagent and keep only the reduced finding in the main thread.
   - Leak: the retainer chain from the object that grows to its root.
   - Spin: the function that runs with no input, and what schedules it (a timer, a poll loop, a retry with no backoff).
   - Glitch: the long task and its callers.
   - Hang: the lock or call every stuck thread waits on.
6. **Walk back to the first wrong state.** The place where the symptom shows is rarely the cause. Find the earliest point where the state differs from the healthy run. Add temporary counters or logs at the allocation or scheduling site, tagged `[DEBUG-<4 hex>]`.
7. **Prove the mechanism** with a prediction that can fail: "if this listener is the leak, growth stops when it is removed". Change that one thing in the running process or behind a flag, capture again, and compare. One variable at a time.
8. **Map it to source:** file, symbol, and the line that allocates or schedules.
9. **Clean up.** Remove every `[DEBUG-` line. Stop the processes you started, by PID.

## Report

- The symptom number, healthy against wrong.
- The captures, as paths.
- The reduced finding and the first wrong state.
- The proof: the prediction, the command, both results.
- The source location.
- What you did not check.

## After the diagnosis

- The user asked only for the cause: the remaining steps of SKILL.md stay as `skip: diagnosis only`, and the delivery is the report with next steps.
- A fix that fits the L1 threshold: go on at step 4 of SKILL.md. The proof run from step 7, as one command with a pass or fail verdict, is the feedback loop.
- A fix beyond the threshold: send the escalation message from [../shared/lanes.md](../shared/lanes.md).
- The process is healthy but slow: that is a performance claim. It goes to okay-perf.
