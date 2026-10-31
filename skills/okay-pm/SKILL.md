---
name: okay-pm
description: "Product management for the okay-* pack, on Linear (GitHub issues as fallback). Three modes. /okay-pm triage: turn raw inbox issues into agent-ready ones (categorise bug or enhancement, reproduce bugs, check redundancy against the code, write an agent brief, set the state). /okay-pm plan: list the open, unblocked, unassigned issues by priority, one line each, and propose the next batch with model tiers and lanes. /okay-pm status: post a project status update (health, shipped PRs, next). Use when the user asks to triage, groom, or review the inbox, what to work on next, or for a project status or progress update. Not for implementing a ticket, and not for recurring digests (use a Linear Loop). Refuses to write anything in contributor mode."
license: MIT
---

# okay-pm

Manage product work in the tracker. Rules shared with the rest of the pack live in `shared/`:

- Tracker (Linear model, GitHub fallback): [shared/tracker.md](shared/tracker.md)
- Contributor mode: [shared/contributor-mode.md](shared/contributor-mode.md)
- Models: [shared/models.md](shared/models.md)
- Lanes: [shared/lanes.md](shared/lanes.md)
- Output and language: [shared/output-style.md](shared/output-style.md)
- Delivery and reflection: [shared/delivery.md](shared/delivery.md)

Agent brief format: [AGENT-BRIEF.md](AGENT-BRIEF.md).

Task list: mode check, then the steps of the chosen mode, then `reflect`. A skipped step stays on it as `skip: <reason>`.

## 0. Mode check

1. Contributor mode on ([shared/contributor-mode.md](shared/contributor-mode.md))? Write nothing, to Linear, GitHub, or files. Reply in one line that okay-pm does not run in contributor mode, and stop.
2. Pick the tracker per [shared/tracker.md](shared/tracker.md). For Linear, load the tools with ToolSearch by suffix: `list_issues`, `get_issue`, `save_issue`, `save_comment`, `save_status_update`, `get_status_updates`, `list_projects`, `list_issue_statuses`, `list_issue_labels`. No `save_issue` found: use the GitHub fallback below and say so in one line.
3. Linear only: resolve the Linear project (`Tracker: linear TON/<Project>`, else `list_projects` by repo name; none found: ask before creating one).
4. Linear only: read `list_issue_statuses` and `list_issue_labels` for team `TON` once. Never assume a state or label exists. A missing label from the table below: ask the user once before creating it.
5. Mode from the argument: `triage`, `plan`, `status`. None given: ask which, one line.

Reads are free. Every write (state, label, comment, status update) is stated in one line before it happens, in the user's language. On Linear, never write to a different project than the one resolved in step 3.

## Roles in Linear

One category and one state per triaged issue.

| Role | Linear |
|---|---|
| bug | label `Bug` |
| enhancement | label `Feature` (new capability) or `Improvement` (better existing one) |
| needs-triage | status type `triage` when the team has it, else `Backlog` with no state label |
| needs-info | label `needs-info`, status `Backlog` |
| ready-for-agent | label `ready-for-agent`, status `Todo` |
| ready-for-human | label `ready-for-human`, status `Todo` |
| wontfix | status `Canceled` (`Duplicate` for duplicates), with a comment saying why |

Two state labels on one issue: stop, show them, ask which is right.

## triage

Input: an identifier, or none (then list the inbox and let the user pick). Inbox = `list_issues` in the project with state type `triage`, plus `Backlog` issues that have no state label. Show counts and one line each, oldest first, max 5 per list.

Per issue:

1. **Gather.** `get_issue` with description, labels, relations, attachments, and `list_issues` with `parentId` for sub-issues. Parse earlier triage notes; do not re-ask what is answered. Read the repo's `CONTEXT.md` and `docs/adr/` when present.
2. **Check redundancy.** Search the code by domain concept, not only the request's words, for an existing implementation. Also search Canceled issues (`list_issues` with `query`) for a prior rejection of the same concept. Report where you looked. Found: it is an already-implemented or previously rejected `wontfix`.
3. **Verify the claim.** A bug is reproduced from the reporter's steps with a real command; report confirmed (with the code path), failed, or insufficient detail. Run it in a throwaway branch or worktree and leave no files behind. An enhancement is checked against the code: does the premise hold? A confirmed reproduction makes the brief much stronger; insufficient detail is a strong `needs-info` signal.
4. **Recommend.** State category and state with reasons and the evidence from steps 2 and 3. The user may override; then apply their choice directly and skip to step 6.
5. **Grill only if needed.** When the request needs shaping, ask every currently answerable question in one batch, each with a recommended answer. Never ask what the code can answer.
6. **Apply.** With the user's go-ahead on the recommendation:
   - `ready-for-agent`: `save_comment` with the brief ([AGENT-BRIEF.md](AGENT-BRIEF.md)); `save_issue` sets the category label, `ready-for-agent`, status `Todo`; change labels with `addLabels` and `removeLabels` (the `labels` field replaces the whole set), and remove the old state label such as `needs-info`.
   - `ready-for-human`: the same brief plus one line on why it cannot be delegated (judgment, external access, design call, manual testing).
   - `needs-info`: a comment listing what is established and the specific questions for the reporter; label `needs-info`.
   - `wontfix`: a comment with the reason, then `save_issue` status `Canceled`. Already implemented: point to where it lives. Rejected enhancement: state the concept and the durable reason ("Out of scope: <concept>. Reason: ...") so the redundancy search finds it next time. Rejected bug: a polite explanation.
   - needs-triage: apply the category only.
7. Never apply a priority, assignee, or project change the user did not ask for.

Do not code the fix. Triage ends at the state change.

## plan

Read-only. Output a ranked list and a proposed batch; nothing is assigned or moved until the user says so.

1. **Frontier.** Open = status type `backlog` or `unstarted`. `list_issues` in the project with `assignee: null`, then drop issues with a delegate. For each candidate call `get_issue` with `includeRelations` and drop it when any blocker is not completed or canceled. A parent spec issue (label `spec`) is not a work item; its sub-issues are.
2. **Rank** by priority (Urgent, High, Medium, Low, then none), then oldest first. Issues without `ready-for-agent` stay in the list marked `needs triage`; they are never put in the batch.
3. **List.** One line each: `TON-12 [High] Add retry to export. ready`. At most 5 lines shown; the rest summarised as a count.
4. **Propose the batch.** Pick ready issues that can run in parallel: no blocking edge between them and no shared files (read each brief's key interfaces; unsure means serialise). For each give lane ([shared/lanes.md](shared/lanes.md)) and model tier and effort ([shared/models.md](shared/models.md)):

   ```
   Batch (3, parallel):
   1. TON-12 | L2 | sonnet high | okay-dev
   2. TON-15 | L1 | sonnet high | okay-fix
   3. TON-18 | L2 cross-module | opus high | okay-dev
   Held back: TON-20 (blocked by TON-18), TON-22 (not triaged).
   ```

5. End with one next action: "Run /okay-dev on these, or tell me what to change."

okay-pm proposes; okay-dev dispatches.

## status

Posts one project status update.

1. Window: since the last update (`get_status_updates` for the project), else the last 14 days.
2. **Shipped.** Issues in the project that reached `Done` in the window. For each, take the linked PR from `get_issue` attachments and confirm it merged (`gh pr view <url> --json state,mergedAt`). Only merged PRs count as shipped; a Done issue with no merged PR is listed under open items.
3. **In flight.** Issues `In Progress` or `In Review`, with their PR state.
4. **Health.**
   - `onTrack`: nothing blocked, nothing overdue, shipped matches what was planned.
   - `atRisk`: a blocked chain, an overdue or slipped item, or review stuck across 3 rounds.
   - `offTrack`: the target date or the goal will be missed without a scope or plan change.
   State the reason in one line; when unsure between two, take the worse one.
5. **Next.** The batch `plan` would propose, max 5 lines.
6. Body (English, Markdown, max 200 words), sections in order: Health (one line with the reason), Shipped (identifier, title, PR link), In flight, Risks and open items, Next. Nothing else.
7. Show the draft and the health to the user, then post with `save_status_update` (`type: project`, `project`, `health`, `body`). Reply with the update link.

Recurring digests are not built here. Tell the user: "For a weekly digest, set up a Linear Loop in Linear; okay-pm status stays on demand." Do not schedule anything.

## GitHub fallback

Used when the Linear tools are missing, or `Tracker: github`. Say so in one line. For `Tracker: gitlab` or `local`, stop with one line saying okay-pm supports Linear and GitHub only.

- Roles are labels: `bug`, `enhancement`, `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Create a missing one only after asking.
- triage: `gh issue list --label needs-triage` plus unlabeled issues; the same steps; comments through `gh issue comment`; state through `gh issue edit --add-label/--remove-label`; `wontfix` closes the issue with `gh issue close`.
- plan: `gh issue list --state open --search "no:assignee"`; a blocker is a `Blocked by: #n` line in the body, open when the issue `#n` is open.
- status: no project status object exists. Post the same body as a comment on the open issue labelled `spec`, or print it when there is none, and say which.

## Finish

Reply in Chinese per [shared/output-style.md](shared/output-style.md): the result first (state set, batch proposed, or update link), then one next action. End per [shared/delivery.md](shared/delivery.md): the issue or update link, or for a read-only plan the next step, is the delivery; then write the marker and run okay-reflect.
