# Contributor mode

For repos where the user is only a contributor (for example a company repo). Leave no footprint the maintainers did not ask for, and leak nothing.

## Detection

Read `~/.claude/okay.local.md` (machine-local, never committed). Each bullet under its `## Contributor repos` heading is a pattern (`*` matches anything), checked against the origin URL and the repo's top-level path. A match turns contributor mode on. No file means contributor mode is off.

## Rules

1. No issues created, no issue comments.
2. No repo docs written: AGENTS.md, CONTEXT.md, docs/adr/, CONSTRAINTS.md and docs/perf/ stay untouched unless the task itself is that doc.
3. Specs and tickets stay local and untracked, under `.scratch/`, kept out of git through `.git/info/exclude`.
4. Output is an MR whose description has exactly these sections: Problem / Cause / Fix / Evidence.
5. Lessons go to local memory only; nothing goes to the lessons repo.
6. Nothing is sent to Jev.
7. Never merge; the maintainers do.
