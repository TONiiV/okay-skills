# Commits, PRs, and merge policy

## Commits

- One line. No body. No trailers (no Co-Authored-By).
- Follow the repo's existing style; otherwise `type: subject` (fix, feat, chore, docs, refactor, test, perf).
- Never force-push.

## PR / MR

- Title: `type: subject`, at most 70 characters.
- Body: English, at most 300 words, sections in this order: Problem / Cause / Change / Evidence / Not touched / Risks.
- Last line links the issue when one exists: `Closes #<n>` (GitHub) or `Fixes TON-<n>` (Linear).
- No AI attribution anywhere: commits, PR bodies, comments, code.
- Contributor mode uses its own MR description (see [contributor-mode.md](contributor-mode.md)).

## Merge policy

- Merge needs an allow rule for `gh pr merge` / `glab mr merge` (the auto-mode classifier refuses merges without one). Without that rule, stop at `APPROVED` and hand the merge to the user with the PR/MR link.
- L1 with the allow rule: merge once the PR has a comment starting with `APPROVED` and CI is green. Use `gh pr merge --auto --squash` (or `glab mr merge --auto-merge --squash`). If auto-merge is disabled on the repo, wait with `gh pr checks --watch`, then merge. If the repo has no CI checks at all, run the full test suite locally, paste the result in the PR, and merge only if it passes.
- L2+: merge only after the user explicitly approves in the conversation, and only with the allow rule above.
- Pushing needs the user's OK unless the lane's merge policy already covers it (L1 with the allow rule does).
- Contributor mode never merges; maintainers do.
