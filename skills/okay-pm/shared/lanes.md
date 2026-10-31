# Lanes

Every dev request gets exactly one lane. A compound request is split into sub-tasks, each routed on its own.

| Lane | When | Skill |
|---|---|---|
| L1 | Small fix or bug fix inside the L1 threshold | okay-fix |
| L2 | Planned feature: an existing issue, spec, or ticket link | okay-dev |
| L3 | New feature with no agreed plan | okay-dev |
| New product | No existing codebase, or a separate new app or service | okay-dev, L3 flow (prototype-first) |
| L4 | Architecture: hard to reverse, cross-module structure, no production code | okay-think |
| L5 | UI/UX work | okay-design |
| perf | A performance claim or regression | okay-perf |

## L1 threshold

A change is L1 only when ALL of these hold, measured on the full diff against the base branch, untracked files included. Test files do not count toward the file or line budget; count only non-test files:

1. At most 2 files changed.
2. Fewer than 50 changed lines (added + removed).
3. No public interface change (exported signature, CLI flag, HTTP route, config key, schema) and no data-structure change (persisted shape, wire format, type of a shared field).
4. Nothing touching auth, payment, or data deletion.

Measure with `git add -N . && git diff --numstat <base>`, then drop test files (the repo's test-file convention, e.g. `*.test.*`, `*.spec.*`, `test_*.py`, `*_test.go`, `test/`, `tests/`, `__tests__/`) from the count.

## Prototype first

New product, L3 and L4 never start from an assumed spec. L1 and L2 (already planned) are unchanged; UI work already runs three variants in okay-design.

1. Grill briefly, only to name the decisions the samples must answer and the signals the user will judge them by.
2. Build 1-3 runnable samples. Pick the count by how open the question is and state the reason.
3. The user tries them.
4. Collect structured feedback: worked / did not / surprised me.
5. Only then grill the remaining gaps, write the spec, cut tickets, implement.

- Samples are throwaway code: variants behind one switcher where possible, runnable with one command or URL, kept on a `prototype/<name>` branch and linked from the spec. A `prototype/<name>` branch is never merged.
- L4 samples are spikes, also throwaway code on `prototype/<name>`, that exercise the risky assumption; measure it when it is a performance or scale question.
- The spec may inline decision-rich snippets from the chosen sample (state machine, schema, type shape).

## Escalation

When an L1 task crosses the threshold, stop before committing. Leave the working tree as it is and send:

```
L1 exceeded: <condition> (<measured value, e.g. 4 files / 120 lines / changes exported parseDate signature>).
Suggested lane: <L2|L3|L4|L5|perf>. Next: run /okay-dev with this task, or tell me to continue in that lane.
```

No commit, no PR, no merge after an escalation.

A breach found after the PR is open (an L1 fix pass): post the same message as a comment on that PR, push nothing more, and do not merge. The new lane continues on that PR.

## Task size

| Size | Files | Rule |
|---|---|---|
| XS | 1 | |
| S | 2 | |
| M | 3-5 | |
| L | 6-8 | Split |
| XL | 9+ | Must split |

## Process rules

- A skipped step stays on the task list as `skip: <reason>`.
- In L2 and above the main thread is the PM: it neither writes nor reviews code. In L1 it may implement; review is always a separate subagent.
- Every okay-* task list ends with a reflect step (see [delivery.md](delivery.md)).
