# Tracker adapter

Issues, specs, and tickets live in a tracker. PRs/MRs always live on the code host (`gh` or `glab`, chosen from `git remote get-url origin`), whatever the tracker is.

## Resolution order

Take the first that applies:

1. Contributor mode is on: no tracker (see [contributor-mode.md](contributor-mode.md)).
2. The repo's `AGENTS.md` has a `Tracker:` line. Values: `linear <TEAM>/<Project>`, `github`, `gitlab`, `local`.
3. Otherwise: Linear.

## Linear

- Workspace `toniiiic`, team key `TON`. The plan has no Initiatives: do not use them.
- The Linear connector is an MCP server whose tool names carry a per-install prefix. Refer to tools by suffix and load them with ToolSearch first: `save_issue`, `save_project`, `save_status_update`, `get_issue`, `list_issues`, `list_projects`.
- One Linear Project per product/repo. If `AGENTS.md` names none, find one named after the repo with `list_projects`; if none exists, ask before calling `save_project`.
- A spec is a parent issue in that project, labelled `spec`.
- Tickets are sub-issues of the spec. Blocking edges are native `blocks` relations. Each ready ticket carries the `ready-for-agent` label.
- After each delivery wave, post a project status update (`save_status_update`): health, what shipped, what is next.
- Branch names carry the identifier: `ton-<n>-short-slug`, e.g. `ton-12-shared-rules`.
- PR bodies end with `Fixes TON-<n>`, see [git.md](git.md).

## GitHub fallback

If the Linear connector is missing in this session (ToolSearch finds no `save_issue`), use the code host's issues and say so in one line before continuing.

| Remote | Tool | Issue | PR / MR |
|---|---|---|---|
| github.com | `gh` | `gh issue create`, `gh issue comment` | `gh pr create`, `gh pr comment`, `gh pr merge` |
| GitLab host | `glab` | `glab issue create`, `glab issue note` | `glab mr create`, `glab mr note`, `glab mr merge` |
| No remote | local files | spec: `.scratch/<feature>/spec.md`; tickets: `.scratch/<feature>/issues/<NN>-<slug>.md` | None: commit on a branch, deliver next steps |

- The same table serves `Tracker: github`, `gitlab`, and `local`. With no remote, use local files.
- Unknown host: ask the user once which CLI to use.
- A local issue file holds a title line, the body, and its blocking edges as text (`Blocked by: 01, 03`).
