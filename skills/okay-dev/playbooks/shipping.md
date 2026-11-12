# Shipping

Land a stack of PRs bottom-up. Use it when the user says "land", "ship" or "merge the stack". Those words approve the merges of the PRs they name; a grant ([../shared/autonomy.md](../shared/autonomy.md)) does the same for its scope. Neither: stop at merge-ready and hand over the links.

Green is not safe. Green checks say one head passed CI on one base. They do not say an independent reviewer read the change that will land.

## 1. Verify each PR on its own

1. List the stack bottom to top: PR, branch, base, head SHA.
2. Each PR needs its own `APPROVED (round <n>) at <sha>` whose SHA equals its current head ([../shared/review.md](../shared/review.md)). An approval of the PR below, of the whole stack, or from a bot does not count.
3. A missing or stale approval: call okay-review for that PR with its contract. The author of the code never approves.
4. Restacking moves heads without failing a check. Compare each approval SHA with the head again right before the merge, not once at the start.

## 2. Find the run

Walk up from the lowest unmerged PR. Stop at the first PR that is not merge-ready ([babysit.md](babysit.md) defines it). The PRs below that point are the run; the top one is the ceiling.

- Only this contiguous run from the root lands.
- An approved PR above an unapproved one waits: it cannot land without the code under it.
- A PR that neither holds nor needs the code below it can be retargeted to the base and land alone. A retarget keeps the head and changes the diff, so the old approval no longer covers what will merge: it needs a fresh review against the new base first.

## 3. Land one PR at a time

Always the lowest unmerged PR of the run:

1. Its base must be the repo's base branch. A PR whose base is still its parent's branch would merge into that branch. Retarget first: `gh pr edit <n> --base <base>`, then get a fresh review of the diff against the new base before it lands.
2. Merge the base into its branch when the head does not contain the base tip. This is always the case after the PR below was squash-merged. Push, wait for CI, get the re-check and the new approval at the new head.
3. Run the merge gate and the merge command from [../shared/git.md](../shared/git.md), pinned to the approved SHA.
4. Read the PR back: `gh pr view <n> --json state,mergedAt,baseRefName` (where the CLI cannot run, the REST form in [../shared/git.md](../shared/git.md)). It must read merged, with the base branch as its base. A queued merge or an armed auto-merge is not a merge.
5. Under a grant, add the trail line with `undo: git revert <merge commit>`.

Never arm auto-merge on a PR whose approval does not cover its current head: it lands whatever head is ready.

## 4. Hands off the stack

- While the run lands, the only branch changes are the retarget and the base merge of step 3. No rebase, no force-push, no branch deletion.
- A merge that stalls: find out why before changing anything.
- Stop at the ceiling. Going further needs new approvals, which is a new pass from step 1.

## Reply

The run and its ceiling, each PR with its approval (round, SHA, who reviewed), what landed and the merge commits read back, and what the next PR above the ceiling still needs.
