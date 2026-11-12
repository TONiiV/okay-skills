# Refactoring: the structure changes, the behaviour does not

Used when Classify in SKILL.md routes a sub-task here. It runs as the L2 flow (worktree, fresh implementer, okay-review loop). The rules below go into the implementer's brief and into the review contract.

## Gate

- The change adds or corrects behaviour: not this route. Classify it into a lane.
- The reshape crosses modules or is hard to reverse: L4, okay-think.
- A signature that callers outside this repo use must change: that is a public interface change. Ask the user first, then run it as L2 or L3.
- Size it with the task-size table in [../shared/lanes.md](../shared/lanes.md). L or XL: split along module seams with okay-to-tickets. Each ticket is one behaviour-preserving step that leaves the base branch working.

## Steps

1. **Name the contract.** Write what a caller or user can observe: outputs, errors, side effects, the public interface. This is what must not change.
2. **Pin it.**
   - Run the existing tests. They are green before anything moves. Red base: stop and tell the user.
   - For each seam you will move that no test covers, add a characterisation test. It records what the code does now, odd behaviour included.
   - A type check and a lint run are not a pin.
   - Commit the pins first, alone: `test: pin <what>`.
3. **Name the target shape** in three lines: what is deleted, what moves, what the call graph looks like after. If the result is not easier to read somewhere, do not do it.
4. **Subtract before you add.** Delete dead code, wrappers with one caller, and duplicate checks first. Own commit.
5. **Reshape in small steps.** Run the pins after each step. A step that turns a pin red is reverted. The pin is not edited.
6. **Migrate, then delete.** When an internal interface changes, move every caller and delete the old path in the same change. No shim. No old and new path side by side. Grep the old name in strings, docs, config and tests too: a rename misses those.
7. **No behaviour change mixed in.** A bug found on the way stays as it is, pinned. Record it as its own task (an issue per [../shared/tracker.md](../shared/tracker.md); in contributor mode, a next step in the delivery) and fix it after this lands. Editing a pin to make it pass is a behaviour change: stop.
8. **Prove it is equal.** The pins are unchanged since the pin commit and green on the head. For a larger move, also run the same inputs through the base and the head (a second worktree at the base) and diff the outputs.
9. **Commit and PR** per [../shared/git.md](../shared/git.md), in this order: pins, subtraction, reshape (`refactor: <subject>`). In the PR body, Evidence holds the pin commands with their output on the base and on the head. Not touched lists each bug found and left.

## Review

The same loop as L2: okay-review, a separate fixer, the 3-round cap ([../shared/review.md](../shared/review.md)). Add these lines to the contract the reviewer gets:

```
This change is behaviour-preserving. Any observable change is a blocking finding.
A pin test edited after the pin commit is a blocking finding.
An old path left beside the new one is a blocking finding.
```

## Deliver

One line per item: the structure that changed, the pins it was held against, the equality proof, the bugs found and left as follow-ups. No new behaviour.
