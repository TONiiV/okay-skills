# Agent briefs

An agent brief is the comment posted on an issue when it moves to `ready-for-agent`. The original body and discussion are context; the brief is the contract an unattended agent works from.

The issue may wait for days. Write the brief so it survives refactors.

## Principles

- **Durable.** Describe interfaces, types, and behavioural contracts. Name the types, function signatures, or config shapes to look for. No file paths, no line numbers, no assumptions about the current structure.
- **Behavioural, not procedural.** Say what the system should do, not how to build it. Good: "`SkillConfig` accepts an optional `schedule` of type `CronExpression`". Bad: "open the types file and add a field on line 42".
- **Testable.** Every acceptance criterion can be checked on its own. Bad: "triage works". Good: "`list --json` exits 0 and prints valid JSON when the list is empty".
- **Bounded.** State what is out of scope so the agent does not gold-plate.
- **Verified.** When triage reproduced the bug, include the reproduction command and the observed output, secrets replaced by `<REDACTED>`.

## Template

```markdown
## Agent Brief

**Category:** bug / enhancement
**Summary:** one line: what has to happen

**Current behavior:**
What happens now. For a bug, the broken behaviour, with the reproduction command and output.
For an enhancement, the status quo it builds on, and where triage found related code.

**Desired behavior:**
What should happen after the work, including edge cases and error conditions.

**Key interfaces:**
- `TypeName`: what changes and why
- `functionName()`: current return versus required return
- Config shape: any new option

**Acceptance criteria:**
- [ ] Testable criterion 1
- [ ] Testable criterion 2

**Out of scope:**
- A thing that must not change
- An adjacent feature that is separate
```

## Bad brief

"Fix the triage bug. Look at the main handler near line 150 and edit the types file." It has no category, no current or desired behaviour, no acceptance criteria, no scope, and its pointers go stale.
