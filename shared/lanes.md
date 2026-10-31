# Lanes

Every dev request gets exactly one lane. A compound request is split into sub-tasks, each routed on its own.

| Lane | When | Skill |
|---|---|---|
| L1 | Small fix or bug fix inside the L1 threshold | okay-fix |
| L2 | Planned feature: an existing issue, spec, or ticket link | okay-dev |
| L3 | New feature with no agreed plan | okay-dev |
| L4 | Architecture: hard to reverse, cross-module structure, no code | okay-think |
| L5 | UI/UX work | okay-design |
| perf | A performance claim or regression | okay-perf |

## L1 threshold

A change is L1 only when ALL of these hold, measured on the full diff against the base branch, untracked files included. Test files do not count toward the file or line budget; count only non-test files:

1. At most 2 files changed.
2. Fewer than 50 changed lines (added + removed).
3. No public interface change (exported signature, CLI flag, HTTP route, config key, schema) and no data-structure change (persisted shape, wire format, type of a shared field).
4. Nothing touching auth, payment, or data deletion.

Measure with `git add -N . && git diff --numstat <base>`, then drop test files (the repo's test-file convention, e.g. `*.test.*`, `*.spec.*`, `test_*.py`, `*_test.go`, `test/`, `tests/`, `__tests__/`) from the count.

## Escalation

When an L1 task crosses the threshold, stop before committing. Leave the working tree as it is and send:

```
L1 exceeded: <condition> (<measured value, e.g. 4 files / 120 lines / changes exported parseDate signature>).
Suggested lane: <L2|L3|L4|L5|perf>. Next: run /okay-dev with this task, or tell me to continue in that lane.
```

No commit, no PR, no merge after an escalation.

## Task size

| Size | Files | Rule |
|---|---|---|
| XS | 1 | |
| S | 1-2 | |
| M | 3-5 | |
| L | 5-8 | Split |
| XL | 8+ | Must split |

## Process rules

- A skipped step stays on the task list as `skip: <reason>`.
- In L2 and above the main thread is the PM: it neither writes nor reviews code. In L1 it may implement; review is always a separate subagent.
- Every okay-* task list ends with a reflect step (see [delivery.md](delivery.md)).
