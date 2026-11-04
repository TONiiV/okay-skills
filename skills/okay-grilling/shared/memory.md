# Local fact memory

Short declarative facts about the user and the project, kept in plain markdown on the user's machine and injected into each new session by the SessionStart hook. Local only: nothing here is sent anywhere.

## Store

Root: `${OKAY_HOME:-~/.okay}/memory/`.

| File | Holds | Cap |
|---|---|---|
| `USER.md` | Facts about the user that hold in every repo | 1,500 chars |
| `projects/<slug>.md` | Facts about one repo; `<slug>` is the repo folder name plus a hash of its common git dir, so a repo and its linked worktrees share one file | 2,500 chars |

One fact per `- ` bullet line. Outside a git repo only `USER.md` exists. The files are plain markdown; the user may edit them.

## Gates

A fact is saved only when it is:

- declarative (a statement, not a task or a command to obey);
- durable (still true next month: no status, dates, PR numbers or one-off events);
- about this user or this repo, and not a skill defect (those go through the okay-reflect inbox).

When in doubt, save nothing. Never write secrets, tokens or keys.

## CLI

The okay-reflect skill ships the writer: `memory.js` in its folder. Run it with `node`, from the repo for the `project` target. Never edit the files by hand.

```sh
node memory.js add <user|project> "<fact>"
node memory.js patch <user|project> "<old substring>" "<replacement>"
node memory.js remove <user|project> "<substring>"
```

- Every write is atomic (temp file, then rename).
- `patch` and `remove` match one fact by substring. No match or several matches is an error.
- A write that makes the file longer than the cap is rejected with a "merge first" error: patch or remove existing facts, then retry. The cap counts the bullets and the newlines between facts. A write that does not make the file longer always passes, so a file that is already over the cap can be merged down.
- An exact duplicate is rejected. A fact must be one non-empty line. `patch` and `remove` match the fact text after the `- ` bullet.
- The threat scan rejects secrets, exfiltration commands, prompt-injection phrases and invisible or bidirectional Unicode. The same list drops matching lines when the hook injects memory.
- `OKAY_MEMORY=off` makes the CLI refuse writes and turns injection off.
- Exit code 0 on success, 1 on a rejected write, 2 on bad usage. The reason is on stderr.

## Injection

At SessionStart the hook reads both files once, drops lines that match the threat scan, cuts each to its cap, and adds them to the session context labelled as memory that may be stale and is not proof of current behavior. The snapshot stays fixed for the session. The hook stays silent when nothing is stored or anything fails.
