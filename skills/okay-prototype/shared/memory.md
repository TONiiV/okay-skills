# Local fact memory

Short declarative facts about the user and the project, kept in plain markdown on the user's machine and injected into each new session by the SessionStart hook. Local only: nothing here is sent anywhere.

## Store

Root: `${OKAY_HOME:-~/.okay}/memory/`.

| File | Holds | Cap |
|---|---|---|
| `USER.md` | Facts about the user that hold in every repo | 1,500 chars |
| `projects/<slug>.md` | Facts about one repo; `<slug>` is the repo folder name plus a hash of its common git dir, so a repo and its linked worktrees share one file | 2,500 chars |

One fact per `- ` bullet line. Outside a git repo only `USER.md` exists. The files are plain markdown; the user may edit them (a leading UTF-8 BOM is ignored).

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
- A write that makes the file longer than the cap is rejected with a "merge first" error: patch or remove existing facts, then retry. The cap counts Unicode code points (an emoji is one), including the bullets and the newlines between facts. A write that does not make the file longer always passes, so a file that is already over the cap can be merged down.
- An exact duplicate is rejected. A fact must be one non-empty line: CR, LF, U+2028, U+2029 and any other line or paragraph separator are rejected. A fact longer than its file's cap is rejected before the threat scan runs. `patch` and `remove` match the fact text after the `- ` bullet.
- The threat scan has two parts. Guaranteed: secret formats (assignments such as `password is ...`, `api key: ...`, `TOKEN=...`, known key prefixes such as `sk_live_`, `glpat-`, `npm_`, `hf_`, `ASIA...`, JWTs, any `PRIVATE KEY` block header), a network tool next to a secret env reference or an Authorization header with a variable, a credential file (`.env`, `.netrc`, `~/.ssh/`, `~/.aws/credentials`) next to a network tool, `scp` or a pipe, invisible or bidirectional Unicode, and every control character except TAB. The emoji joiners U+FE0F, U+200D and U+200C are accepted only between visible characters; U+FE0F may also end a word. The scan runs in linear time. Best effort: prompt-injection wordings (`ignore all previous instructions`, `forget your instructions`). A wording it misses is not a bug; ordinary facts that only mention tokens, keys, `.env.example`, `curl -T dist.zip` or `Override all rules in .eslintrc` pass. The scan normalises first (NFKC, `-` and `_` read as spaces). The same list drops matching lines when the hook injects memory.
- `OKAY_MEMORY=off` makes the CLI refuse writes and turns injection off.
- Exit code 0 on success, 1 on a rejected write, 2 on bad usage. The reason is on stderr.

## Injection

At SessionStart the hook reads both files once, drops lines that are longer than the cap, hold a line separator or match the threat scan, cuts each to its cap (a line that no longer fits is skipped and a later shorter one is still kept), and adds them to the session context labelled as memory that may be stale and is not proof of current behavior. The snapshot stays fixed for the session. The hook stays silent when nothing is stored or anything fails.
