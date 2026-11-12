# Principles

Adapted from the pstack principle skills (MIT, Lauren Tan). Rewritten in this pack's words, near-duplicates merged.

Read this file in full before you write, design or review code.

- Each entry has a trigger. Apply an entry only when its trigger fits the work in front of you.
- In your final report, name each principle that changed a decision and the choice it changed: `Smallest change: reused the existing parser, wrote no new one`.
- Name none you did not apply. A name with no decision behind it is noise.
- Lane rules, the review contract and the merge policy win over any entry here.

## Core

**Smallest change.** When: sizing a diff, refactoring, or about to add a layer, option or helper. Rule: make the smallest change that solves the problem. Remove dead code and unused paths first, then build on what is left. Design for the usage you can see, not for cases nobody asked for. This: delete the two unused adapters, then extend the one that stays. Not that: a fourth adapter and a base class for all four.

**Data shape first.** When: before you write logic. Rule: name the core types and data structures and trace how they are read and written. Then write the logic. Do the work that helps every later step (shared types, test setup) before the first feature. This: define the `Order` states and their transitions, then the handlers. Not that: handlers first, the shape found later in a refactor.

**Redesign, do not bolt on.** When: a new requirement lands on an existing design. Rule: ask what you would build if the requirement had been there from day one. Carry the change through every reference: types, docs, examples. Plan the whole redesign and deliver it in small steps. If it grows past the lane, escalate. Do not shrink it into a patch.

**Attack the premise.** When: two or more fixes that rest on the same belief have failed the same check. Rule: write that belief down in one sentence. Find an observation that would come out differently if it were false, and make it. Start no further fix before that. This: "the cache is stale" failed twice, so log the cache key and find that the key is wrong. Not that: a third way to invalidate the cache.

**Reader load.** When: shaping or reviewing code that is hard to trace. Rule: count the layers a reader must walk and the hidden state they must hold. Inline a wrapper with one caller and an adapter with one implementation. Prefer return values to mutation, and locals to fields to module state. The test: a new reader can answer "where does X come from" and "what can change X" in 30 seconds.

**User's result first.** When: a product, UX or scope trade-off. Rule: when what is easy to build and what is good to use disagree, pick good to use. The user is whoever consumes the work: the end user, the colleague who imports the library, the next maintainer. Ship fewer things, each finished. This: three options that all work, with error states. Not that: ten options, half of them rough.

**Build the tool.** When: the work is more than a couple of obvious edits, or the same step repeats. Rule: write the script, codemod or generator that does or proves the work, and run it. Do the first unit by hand to learn the recipe. Keep it the smallest script that does the job, safe to rerun. A reviewer reruns a script. A reviewer cannot rerun 40 hand edits. If you name this principle, the script is in the diff or the report.

## Architecture

**Model the domain.** When: stateful logic, code that branches a lot, or the same shape assumption in several files. Rule: put the domain rule in one structure: a state machine, a typed model, a lookup table, a reducer. Do not force it. Plain code stays when it is clear, local and unlikely to grow. This: one `status` union with a transition table. Not that: a second boolean that must stay in sync with the first.

**Guard the boundary, trust the inside.** When: wiring validation, error handling, types or a framework adapter. Rule: parse and validate external data once, where it enters (CLI args, config, network, database rows), into typed values. Inside, trust the types and do not check again. Keep business logic in pure functions the framework only calls. Give ids and units their own types so the compiler rejects a mix-up, and derive types from the schema that owns the shape. This: `parseConfig()` at startup returns a `Config`. Not that: null checks for the same field in five call sites.

**Idempotent operations.** When: a command, lifecycle step or loop that can crash, restart or be retried. Rule: read the current state, compare it with the goal, apply only the difference. A second run then finds nothing to do. Anything a run leaves behind (lock, temp file, claimed job) must be recognisable as stale by the next run. This: write to a temp path, then rename into place. Not that: append to the real file and hope the run finishes.

**Migrate callers, delete the old API.** When: a new internal API replaces one that still has callers, or a planned rewrite. Rule: move every caller and delete the old path in the same piece of work. Add no compatibility shim that exists only to keep a half-way state alive. Applies when no outside user depends on the old API. Every merged PR still passes its checks.

**Separate before you lock.** When: parallel agents or processes might write the same file, branch, key or object. Rule: first remove the sharing. Give each writer its own file, key, branch or worktree and merge at the reading side. Only when one shared target is truly required, serialise with a structure (single writer, lock file, ordered phases). An instruction to "be careful" is not concurrency control. This: one worktree and one branch per agent. Not that: two agents on one branch told to take turns.

## Verification

**Prove it on the real thing.** When: before you call a task done. Rule: check the real artifact directly: run the flow, read the written record, open the page. "It compiles", a file timestamp or an agent's own report is not proof. Prefer a check a reviewer can rerun, and paste its output. When a check fails, suspect the way you observed before you suspect the system.

**Fix the root cause.** When: debugging. Rule: reproduce first. Ask why at each step until the answer is a wrong decision in the code. Fix it there, and fix every other place with the same fault. A guard is a fix only when the state it handles is legitimate. This: the importer writes a null it should not, so fix the importer. Not that: a null check where the page crashed.

**Small verifiable units.** When: multi-step work, a sweep of similar edits, or deciding commit order. Rule: split the work into units that each end in a check. Run the check before you start the next unit. Order the commits so they prove the work: failing test, then fix; removal, then reshape. This: migrate one module, run its tests, go on. Not that: migrate twelve, then find out which one broke the build.

**Test behaviour, not implementation.** When: writing, changing or keeping a test. Rule: assert what a user of the code can observe: return values, errors, readable state, calls to outside systems. Imagine two edits. Break the behaviour: the test must fail. Restructure the internals: the test must still pass. Rewrite or delete a test that misses either. Take the expected value from the requirement, not from a run of the code.

**Explain the number.** When: before you measure, and before you trust, report or act on a measured number (speed, throughput, an eval rate). Rule: write down first which result would change the decision, and the noise level. Name what limits the number, from a profile or counters, not from reading code. Rule out that it measured something else: errors, cached or skipped work, code that never ran. Report the run count and spread with it.

## Delegation

**Guard the context.** When: large outputs, long files, repeated reads, or planning a fan-out. Rule: send bulk reading and searching to subagents and keep only their findings in the main thread. Hand a delegate file paths, not pasted contents. Size each piece of work so it fits one agent.

**Do not ask what you can find out.** When: about to ask the user "which approach" or "should I do X". Rule: if a run, a read or a quick sample can answer it, get the answer yourself and show the result. Decisions that are the user's stay the user's: product direction, pushes and merges the merge policy reserves, anything that cannot be undone. This: try both layouts and show two screenshots. Not that: "which layout is faster to render?"

## Meta

**Encode lessons in structure.** When: you write the same instruction or review comment a second time. Rule: turn it into a lint rule, a test, a type or a script, and then delete the instruction. If it needs judgement and cannot be encoded, make the instruction more prominent and add an example of the failure.
