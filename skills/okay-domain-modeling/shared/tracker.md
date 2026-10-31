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

## When `gh` or `glab` fails

`gh`/`glab` is missing or unauthenticated, or a call is refused. Cloud sessions (`CLAUDE_CODE_REMOTE=true`) block GraphQL at their proxy, so `gh pr` and `gh issue` fail there with 403. Do the same operation the first way below that works, and say so in one line:

1. REST through `gh api` (or `glab api`). In a cloud session it reaches only the repos attached to the session. `gh api` fills in `{owner}/{repo}` from the current repo.
2. The code host's MCP tools: load them with ToolSearch and refer to them by suffix, e.g. `create_pull_request`, `add_issue_comment`.
3. Neither works: put the exact text and commands in the final reply as next steps ([delivery.md](delivery.md)).

| Operation | REST through `gh api` |
|---|---|
| Read an issue or PR, its comments | `gh api repos/{owner}/{repo}/issues/<n>`, `gh api repos/{owner}/{repo}/issues/<n>/comments` |
| PR head SHA, PR diff | `gh api repos/{owner}/{repo}/pulls/<n> --jq .head.sha`; the same path with `-H "Accept: application/vnd.github.diff"` |
| Create an issue | `gh api repos/{owner}/{repo}/issues -f title=<title> -F body=@<file>` |
| Comment on an issue or PR | `gh api repos/{owner}/{repo}/issues/<n>/comments -F body=@<file>` |
| Edit a comment, a PR body | `gh api -X PATCH repos/{owner}/{repo}/issues/comments/<id> -F body=@<file>`; `gh api -X PATCH repos/{owner}/{repo}/pulls/<n> -F body=@<file>` |
| Open a PR | `gh api repos/{owner}/{repo}/pulls -f title=<title> -f head=<branch> -f base=<base branch name> -F body=@<file>` |
| Squash-merge | `gh api -X PUT repos/{owner}/{repo}/pulls/<n>/merge -f merge_method=squash -f sha=<approved sha> -f commit_title=<title> -f commit_message=` |
