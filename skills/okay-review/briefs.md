# Reviewer briefs

Paste a brief verbatim into the fresh agent's prompt, followed by `ARTIFACT:` (the diff) and `CONTRACT:` (request, spec, standards). Nothing else goes in: no CLAIM, no author summary, no hypotheses. Every brief ends with the proof rule.

## Proof rule (appended to every brief)

Report only what you proved. A finding gives one of: the quoted line next to the quoted contract line it breaks; a command you ran with its output; a reproduction. Leave out style you cannot tie to a documented standard or a smell below, and risks that need a future change to matter. "No findings" is a valid result. Tag each finding `[R<round>-<n>] blocking|non-blocking`. Blocking means it breaks the contract, loses data, opens a hole, or fails a run.

## Standards axis

```
Review the ARTIFACT against the repo standards in CONTRACT, and against the smell baseline below.
Report (a) each place the diff violates a documented standard, citing the file and the rule; (b) each baseline smell you spot, named, with the hunk quoted.
Documented standards can be blocking. Smells are always judgement calls (non-blocking) and a documented repo standard overrides the baseline. Skip anything tooling already enforces. Under 400 words.
```

### Smell baseline

Fowler smells, each as what it is, then the fix. Always a labelled heuristic ("possible Feature Envy"), never a hard violation.

- Mysterious Name: a function, variable or type whose name does not say what it does or holds. Rename; if no honest name comes, the design is murky.
- Duplicated Code: the same logic shape in more than one hunk or file. Extract the shared shape.
- Feature Envy: a method that uses another object's data more than its own. Move it onto the data.
- Data Clumps: the same few fields or params travel together. Bundle them into one type.
- Primitive Obsession: a primitive or string standing in for a domain concept. Give it a small type.
- Repeated Switches: the same switch or if-cascade on one type recurs. Use polymorphism or one shared map.
- Shotgun Surgery: one logical change forces scattered edits across many files. Gather what changes together.
- Divergent Change: one module edited for several unrelated reasons. Split it.
- Speculative Generality: abstraction, parameters or hooks for needs the spec does not have. Delete it.
- Message Chains: long `a.b().c().d()` navigation. Hide the walk behind one method.
- Middle Man: a class or function that only delegates. Call the real target.
- Refused Bequest: a subclass that ignores or overrides most of what it inherits. Prefer composition.

## Spec axis

```
Review the ARTIFACT against the spec and request in CONTRACT. Quote the contract line for every finding.
Report (a) requirements that are missing or partial; (b) behaviour that was not asked for (scope creep); (c) requirements that look implemented but are wrong, shown by a run or a failing input.
Blast radius: name the one fact the change is safe because of (for example "this call only drops dead cache entries"), then say how far you got it: 1 stated, 2 pointed at a line, 3 walked the failure and it cannot reach, 4 ran it, 5 reproduced it in the running app. Look where grep stops: wire formats, DB columns, feature flags, callers three hops away. If you cannot get the fact past 2, say "unproven". Under 400 words.
```

## Mutation check

Run it inside the spec reviewer, in a throwaway `git worktree` so the real tree stays untouched; delete the worktree after.

```
Pick one condition the change adds (a negation, a boundary, an && or ||). Invert it. Run the repo's tests. Restore the file.
Mutation stays green: report a finding naming the missing test case, with the mutated line and the green output.
Mutation turns the suite red: report "mutation caught" with the command.
No runnable tests or no executable change (docs, config only): report "skip: <reason>".
```

## Security pass

```
Review the ARTIFACT for security: authn/authz bypass, injection, secrets in code or logs, unsafe deserialisation, missing validation at trust boundaries, data deletion without guard, payment amounts trusted from the client. Prove each issue with a failing test, a request, or a script against the real code. Nothing unrun survives.
```

## Simplification pass

```
Review the ARTIFACT for avoidable complexity: code that could be deleted, an existing helper or stdlib call that already does the work, abstractions with one user, config for values that never change. For each, show the smaller form and run the tests against it. Findings are non-blocking unless the complexity hides a defect you can run.
```

## Adversarial pass (interrogate and doubt)

```
Adversarial review. Find what is wrong with this ARTIFACT given the CONTRACT. Assume the author is overconfident. Look for unstated assumptions, unhandled edge cases, hidden coupling or shared state, ways the contract can be violated, conventions it may break, failure modes under unexpected input.
Break it: prove each finding with a run against the real code (failing test, repro script, command output). Report the exact command, the output it printed, and the output the contract requires. Do not validate, do not summarise. Find issues, or state that you found none after trying.
```

Pass ARTIFACT and CONTRACT only. A pass spawned in the author's session is still a fresh agent with no session context.

## Codex pass (L4)

Send the adversarial brief, ARTIFACT and CONTRACT to Codex through the codex plugin. Run it read-only (never pass `--write`) and put this line in the request: "Read-only review: do not edit, create or delete any file in the working tree; prove findings with commands that only read or run existing code, and report the command and its output." Write the prompt to a file and pass it by file or stdin; never interpolate the artifact into a quoted shell argument. Treat Codex output like any other finding: the orchestrator reruns its commands before keeping it.

## Post-fix check (L1 only)

```
You get the new diff and a list of blocking findings from a prior review. For each finding answer resolved yes or no with evidence (the changed line, or a command and its output). Do not look for new issues.
```
