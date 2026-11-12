# Investigation: a read-only question

Used when Classify in SKILL.md routes a sub-task here: the user asks how something in this codebase works, why it was built this way, or whether a claim holds ("are we sure?"), and asks for no change. The deliverable is an answer with evidence. A request that also wants a change is not this route: classify it into a lane.

## Rules

- Read-only: no edit to a tracked file, no branch, no commit, no PR, no issue, no comment.
- A probe script lives in a temp directory outside the repo and is deleted at the end.
- The main thread may answer a narrow question itself. A question that spans a subsystem: dispatch 2 to 4 read-only agents in one message, one angle each (haiku for lookups, sonnet for analysis, per [../shared/models.md](../shared/models.md)). Each returns claims with their evidence, not file dumps.
- Task list: Split and Merge stay as `skip: read-only`. Deliver and reflect run as usual.

## Steps

1. **Restate.** One line: the question, and its kind: `how` (what the code does now), `why` (the reasons and the history), or `sure` (a claim to test). Scope unclear: state your reading and go on. Ask only when two readings give different answers.
2. **Anchor.** Find the entry points with `git grep`: files, line ranges, key symbols. Read the code and its tests. Never infer behaviour from a name.
3. **How.** Trace the path from the entry point to the effect, in the order it runs. Note where data changes shape and where control leaves the module.
4. **Why.** Read the history, not your own guess:
   - `git log --follow --oneline -- <file>` and `git blame -L <start>,<end> <file>` for the commits;
   - the PR and the issue each commit names (`gh pr view <n>`, or the fallbacks in [../shared/tracker.md](../shared/tracker.md));
   - decision records (`docs/decisions/`, `docs/adr/`), `CONSTRAINTS.md`, comments beside the code.
   A reason no source states is marked `inferred`.
5. **Sure.** What you can observe by running, you run. Do not argue it. A test, a REPL call, a CLI call with a fixture, a read-only query. Show the command and its output, secrets replaced by `<REDACTED>`.
   - The run must change nothing: no write to real data, no deploy, no install into the user's checkout.
   - Cannot run it safely: say so and list it under "What I did not check".
6. **Check the premise.** The question assumes something false: say that first, with the evidence.

## The answer

1. First line: the answer itself. For `sure`: yes, no, or "cannot tell", with your own judgment and the reason.
2. Then the claims. Every claim carries one of:
   - a file and line: `src/queue/retry.ts:41`;
   - a command and its output;
   - a commit, issue or PR: `a1b2c3d`, `#12`.
   A claim with none of these is cut, or marked `inferred`.
3. For `how`, use these headings and drop the ones that do not apply: Overview / How it works / Where things live / Gotchas. For a choice between options: one table of trade-offs and one recommendation.
4. Last section, always present: **What I did not check.** The paths not read, the cases not run, the sources not reachable.
5. End per [../shared/delivery.md](../shared/delivery.md) with next steps. When the answer points to a change, offer it as one next step and do not start it. The change is a new request and is classified again.

## Contributor mode

[../shared/contributor-mode.md](../shared/contributor-mode.md) applies: nothing is posted, and no code goes to another model family.
