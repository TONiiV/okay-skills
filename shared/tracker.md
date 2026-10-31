# Tracker adapter

Pick the tracker from the repo remote (`git remote get-url origin`):

| Remote | Tracker | Issue | PR / MR |
|---|---|---|---|
| github.com | `gh` | `gh issue create`, `gh issue comment` | `gh pr create`, `gh pr comment`, `gh pr merge` |
| GitLab host | `glab` | `glab issue create`, `glab issue note` | `glab mr create`, `glab mr note`, `glab mr merge` |
| No remote | local files | `.scratch/<feature>/issues/<NN>-<slug>.md` | None: commit on a branch, deliver next steps |

Rules:

- Contributor mode overrides this table (see [contributor-mode.md](contributor-mode.md)).
- Unknown host: ask the user once which CLI to use.
- A local issue file holds a title line, the body, and its blocking edges as text (`Blocked by: 01, 03`).
