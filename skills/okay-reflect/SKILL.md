---
name: okay-reflect
description: "Post-task reflection for the okay-* pack. Three read-only reviewers (judgment, tooling, contrarian) and one synthesizer go over the session transcript; only evidence-backed skill defects in okay-* skills that actually ran become candidate lessons in the private TONiiV/okay-lessons inbox, and a class seen in two independent sessions is offered to the user as an exact diff plus one regression prompt, landing in okay-skills only through an approved PR. 'No change' is a valid outcome. Contributor mode keeps lessons in local memory. Use as the last step of every okay-* task, when the Stop hook or session start says an okay-* task is not reflected yet, or when the user says reflect, retro, or 复盘. Not for code review of a diff (okay-review) or for fixing the bug itself."
license: MIT
---

# okay-reflect

Turn one finished task into zero or more evidence-backed lessons. Most runs end in "no change"; that is a good outcome, not a failure.

Shared rules, by reference:

- Output and language: [shared/output-style.md](shared/output-style.md)
- Models: [shared/models.md](shared/models.md)
- Contributor mode: [shared/contributor-mode.md](shared/contributor-mode.md)
- Commit, PR, merge (promotion PRs): [shared/git.md](shared/git.md)
- Delivery and the reflection marker: [shared/delivery.md](shared/delivery.md)
- Code host, and what to do when `gh` fails: [shared/tracker.md](shared/tracker.md)

Reviewer and synthesizer prompts: [prompts.md](prompts.md).

okay-reflect never writes the reflection marker itself, and its task list has no `reflect` step.

## Task list

Create this task list first. A step you skip stays on it as `skip: <reason>`.

1. Scope
2. Review
3. Synthesize
4. File
5. Promote
6. Clear
7. Report

## 1. Scope

1. Contributor mode on? Then steps 4-5 change as written there; nothing leaves the machine.
2. Collect the work to reflect on:
   - this session: the marker at `$(git rev-parse --git-dir)/okay-reflect-pending` (one line per delivered task: time, skill, task);
   - earlier sessions: entries in `${OKAY_HOME:-~/.okay}/reflect-queue.jsonl` (`repo`, `marker`, `transcript_path`, `session_id`), when the user asked to handle them;
   - parked candidates (contributor mode off and the inbox reachable): see Harvest below.
3. Find each transcript: the path the Stop hook named, the queue entry's `transcript_path`, or the newest `~/.claude/projects/<project-slug>/*.jsonl` whose first user message matches this session. No transcript file (for example a claude.ai session): write a digest that quotes events verbatim (failed commands with output, errors, the user's corrections) and contains no judgment of your own.
4. List the okay-* skills that actually ran: a skill tool call or a read of `skills/okay-*/SKILL.md` in the transcript, or a skill named on a marker line. Only these can receive a lesson.
5. User said skip, or the session has no error, failed command, or user correction at all: outcome is "no change". File any parked candidates (Harvest in step 4), then go to step 6.

## 2. Review

Spawn three reviewers in one message, in parallel. Each is read-only (an Explore-type agent, or one told it may not edit, commit, post, or create anything) with fresh context:

| Lens | Model | Prompt |
|---|---|---|
| Judgment | opus | [prompts.md](prompts.md#judgment) |
| Tooling | sonnet | [prompts.md](prompts.md#tooling) |
| Contrarian | opus | [prompts.md](prompts.md#contrarian) |

Pass each prompt verbatim with the transcript path (or digest) and the list of skills that ran. Give them no opinion of yours about what went wrong.

## 3. Synthesize

One opus agent, read-only, gets [prompts.md](prompts.md#synthesizer) with the three outputs inlined. It applies the gates below and returns Candidates / Project mechanisms / Dropped. Check its output against the gates yourself before filing; a row that fails a gate moves to Dropped.

### Gates

1. **Evidence.** Each candidate quotes one observable event: an error, a failed command with its output, or a user correction in the user's words. No event, no candidate.
2. **Attribution.** The lesson names one okay-* skill from the step 1.4 list and the section that caused or failed to prevent the event. Anything else (other skills, the model in general, the repo) is not an okay-skills lesson.
3. **Classification.** Exactly one of:
   - `skill defect`: the skill's text is missing, wrong, or ambiguous, and following it led to the event. Only this class becomes a candidate.
   - `wrong expectation`: the skill behaved as written and the text is right; the expectation of the agent or the request was off. Dropped.
   - `environment`: tool, network, permission, or machine failure. Dropped; mention it in the report when the user can act on it.
   - `uncertain`: the evidence does not settle the class. Dropped and listed.
4. **Structure first.** If a hook, lint, script, test, or frontmatter check can enforce the lesson, the candidate's fix is that mechanism, not prose. Prose is only for judgment calls nothing can check. A mechanism that belongs in the user's project rather than in okay-skills is a next step for the user, not a candidate.
5. **Durable and public-safe.** Still true after paths, versions, and SHAs change. Written without repo names, company names, people, hosts, paths, or code identifiers from the session.

## 4. File

Contributor mode: save each candidate to the host's local memory (in Claude Code, this project's memory), else append it to `~/.okay/lessons.local.md`. No issue, no comment, no network. Skip step 5.

Otherwise, through the inbox adapter below, for each candidate:

1. List open candidates for that skill. The same class means the same skill, the same section, and the same failure mode, whatever the wording.
2. No match: create an issue. Match: comment on it with the new occurrence. Either way the text holds the class, the skill and section, the redacted evidence quote, the session id, the fix kind (`mechanism: <hook|lint|script|test>` or `prose`), and the proposed fix in one sentence.
3. The class now has occurrences from at least two different sessions: promote it (step 5). Two findings from one session count once.

### Inbox adapter

The inbox is the private GitHub repo `TONiiV/okay-lessons`. Moving it (for example to Linear) changes only this table.

| Action | Command |
|---|---|
| List | `gh issue list -R TONiiV/okay-lessons --state open --label lesson:candidate --label skill:<skill> --json number,title,body,comments` |
| Create | `gh issue create -R TONiiV/okay-lessons --title "[<skill>] <class>: <principle>" --label lesson:candidate --label skill:<skill> --body-file <file>` |
| Add occurrence | `gh issue comment <n> -R TONiiV/okay-lessons --body-file <file>` |
| Promote | `gh issue edit <n> -R TONiiV/okay-lessons --add-label lesson:promoted --remove-label lesson:candidate`, then comment the PR link |
| Reject | `gh issue edit <n> -R TONiiV/okay-lessons --add-label lesson:rejected --remove-label lesson:candidate`, then `gh issue close <n> -R TONiiV/okay-lessons --comment "<reason>"` |

A missing `skill:<skill>` label: create it with `gh label create`. When `gh issue` fails, use the REST form from [shared/tracker.md](shared/tracker.md); labels go as `-f 'labels[]=lesson:candidate'`.

### Inbox unreachable

Neither `gh` nor its fallbacks reach `TONiiV/okay-lessons` (for example a cloud session with only the work repo attached):

1. Post all candidates as ONE comment on the delivered PR. Its first line is exactly `okay-lesson-candidates`; then one block per candidate, headed `### <k>. [<skill>] <class>: <principle>`, holding the step 4.2 text.
2. No delivered PR: show the candidates to the user as next steps instead.
3. Keep the marker (step 6), and say in the report where the candidates wait.

Never in contributor mode: there step 4 keeps lessons local. A multi-repo cloud session that has `TONiiV/okay-lessons` attached (the Claude GitHub App installed on it) reaches the inbox through `gh api` REST and files directly.

### Harvest

A local run with inbox access first files candidates parked on PRs. They already passed the gates, so they skip steps 2-3:

1. Find them: `gh api -X GET search/issues -f q='"okay-lesson-candidates" in:comments is:pr commenter:<login>'`, with `<login>` from `gh api user --jq .login`. In each PR, read the comments whose first line is `okay-lesson-candidates`.
2. File each candidate block that has no `filed:` line for its number yet, per step 4.
3. Right after filing candidate `<k>` as issue `<n>`, edit the comment (`gh api -X PATCH repos/<owner>/<repo>/issues/comments/<id> -F body=@<file>`) to append the line `filed: okay-lessons#<n> (<k>)`, so it is never filed twice.

## 5. Promote

1. Get `TONiiV/okay-skills` (an existing local checkout, else `gh repo clone` into a temp dir) and branch off its default branch: `lesson/<issue n>-<slug>`.
2. Draft the smallest change that would have prevented every occurrence:
   - the mechanism (hook, script, test) when the fix kind says so; or
   - a prose edit in the owning skill's section, carrying a one-line why and its source, e.g. `Why: <reason> (lesson: okay-lessons#<n>)`.
3. Add exactly one regression prompt to that skill's `evals.json`: `kind: "behavioural"`, `id: "lesson-<n>"`, a generic prompt that reproduces the situation, and expectations that fail on the old text.
4. Strip private details: replace every repo, company, person, host, path, and code identifier from the occurrences with a generic stand-in, then grep the diff for the session's repo names and remote hosts. Any hit: fix it before showing.
5. Show the user the exact unified diff plus the regression prompt and ask: approve, edit, or reject. Wait for the answer.
6. Reject or "no change": mark the issue rejected with the user's reason. Done.
7. Approve: in the okay-skills checkout run `npm run build` if `shared/` changed and `npm test`, commit one line (`type: subject`), push, and open a PR per [shared/git.md](shared/git.md) (L2+ merge policy: the user merges). Mark the issue promoted with the PR link.

## 6. Clear

After step 4 (or step 5) finished, or when the user said skip:

1. Delete this repo's marker: `rm -f "$(git rev-parse --git-dir)/okay-reflect-pending"`.
2. Remove each queue entry you handled, by session id:

   ```sh
   node -e "const fs=require('fs'),[f,s]=process.argv.slice(1);fs.writeFileSync(f,fs.readFileSync(f,'utf8').split('\n').filter(l=>l&&JSON.parse(l).session_id!==s).map(l=>l+'\n').join(''))" "${OKAY_HOME:-$HOME/.okay}/reflect-queue.jsonl" <session_id>
   ```

If filing failed, keep the marker and the entries so the next session offers them again.

## 7. Report

Reply in the shape of [shared/output-style.md](shared/output-style.md), at most 5 lines:

- Outcome first: `no change`, the candidate issue links, or the promotion PR link.
- One line per dropped finding with its class or gate.
- Environment problems or project-side mechanisms the user can act on, as numbered next steps.
