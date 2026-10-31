# Commits, PRs, and merge policy

## Commits

- One line. No body. No trailers (no Co-Authored-By).
- Follow the repo's existing style; otherwise `type: subject` (fix, feat, chore, docs, refactor, test, perf).
- Never force-push.

## PR / MR

- Title: `type: subject`, at most 70 characters.
- Body: English, at most 300 words, sections in this order: Problem / Cause / Change / Evidence / Not touched / Risks.
- Last line links the issue when one exists (`Closes #<n>`).
- No AI attribution anywhere: commits, PR bodies, comments, code.
- Contributor mode uses its own MR description (see [contributor-mode.md](contributor-mode.md)).

## Merge policy

- L1: auto-merge once the PR has a comment starting with `APPROVED` and CI is green. Use `gh pr merge --auto --squash` (or `glab mr merge --auto-merge --squash`). If auto-merge is disabled on the repo, wait with `gh pr checks --watch`, then merge. If the repo has no CI checks at all, run the full test suite locally, paste the result in the PR, and merge only if it passes.
- L2+: merge only after the user explicitly approves in the conversation.
- Pushing needs the user's OK unless the lane's merge policy already covers it (L1 does).
- Contributor mode never merges; maintainers do.
