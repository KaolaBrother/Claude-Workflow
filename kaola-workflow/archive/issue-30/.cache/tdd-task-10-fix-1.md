# TDD Task 10 Fix 1: cmdClaim same-session resume ordering

## Bug Fixed

`cmdClaim()` in `scripts/kaola-workflow-claim.js` ran `issueAlreadyClaimed()` BEFORE the
same-session resume-detection block. This caused same-session re-claim to exit 2 (AC4 blocked),
because `issueAlreadyClaimed` found the existing lock for the current session and returned true.

## RED Evidence

Before fix, walkthrough crashed at Epic Case 15D (line 3400):

```
Error: Command failed: ...kaola-workflow-claim.js claim --session sess-15a
    --project issue-501 --issue 501 --runtime claude
status: 2
```

The same-session re-claim (AC4) silently exited 2 because `issueAlreadyClaimed` fired before
the resume-detection block could detect and resume the existing worktree.

## Primary Fix (cmdClaim reorder)

In `cmdClaim()`, moved `const lp = lockPath(...)` and the resume-detection block
(existingLock same-session check → AC4/AC11 paths) to run BEFORE the
`issueAlreadyClaimed` guard. The `issueAlreadyClaimed` check now runs only when the
existing lock does NOT belong to the current session.

New order:
1. `const lp = lockPath(coordRoot, args.project)`
2. Resume-detection: if `existingLock.session_id === args.session` → AC4 (resume) or AC11 (missing worktree)
3. `if (args.issue != null && issueAlreadyClaimed(...))` → exit 2 only for different session/project

## Additional Fixes Required for GREEN

The walkthrough had new tests (Epic 15 and Epic 16) that exposed additional gaps:

### Fix 2: `releaseSession` did not clear `status: active` in workflow-state.md
After releasing a lock, `activeStateIssueNumbers()` still found the issue as claimed
via the workflow-state.md file (even though the lock file was removed). Added cleanup
in `releaseSession` to replace `status: active` with `status: released` so subsequent
claims for the same issue number succeed (Epic 15F / AC6).

### Fix 3: `cmdWatchPr` skipped `sink=merge` locks
The `if (lock.sink !== 'pr') continue` guard caused watch-pr to skip all merge-sink
locks even when their PR was MERGED or CLOSED. Removed this guard and changed the
PR lookup to use the branch name when `pr_url` is absent (Epic 16A/AC7, 16B/AC8).

### Fix 4: `kaola-workflow-sink-merge.js` — worktree removal before checkout
sink-merge called `git checkout <branch>` while the branch was locked to a worktree.
Added a step 0 to remove the worktree before the checkout so the branch can be
checked out in the main repo (Epic 16G / AC13).

### Fix 5: `kaola-workflow-sink-merge.js` — `assertCleanWorktree` ignored untracked files
The `git status --porcelain` call included untracked files (e.g. `kaola-workflow/` state
dirs). Changed to `git status --porcelain --untracked-files=no` to only block on
staged/unstaged tracked changes (Epic 16G).

### Fix 6: `kaola-workflow-sink-merge.js` — OFFLINE rebase skip when no `origin/main`
When `git merge-base HEAD origin/main` fails (no remote configured), changed the
catch branch to `alreadyUpToDate = true` so the rebase is skipped rather than
propagating an error (Epic 16G OFFLINE mode).

### Fix 7: `hooks/kaola-workflow-pre-commit.sh` — direct `git commit` with session set
The pre-commit hook gated ALL session checks on `INVOKED_CMD` containing "git commit"
extracted from `HOOK_INPUT`. When `HOOK_INPUT` is absent (direct `git commit`),
`INVOKED_CMD` was empty and the hook exited 0 unconditionally. Changed the guard so
the INVOKED_CMD check only applies when `HOOK_INPUT` is non-empty; when `HOOK_INPUT`
is absent (direct commit), the hook falls through to the `KAOLA_SESSION_ID` check
which blocks cross-session commits (Epic 16H / AC9).

## GREEN Evidence

After all fixes:
```
Workflow walkthrough simulation passed
WALKTHROUGH_EXIT:0
```

Confirmed stable across two consecutive runs.

## Files Changed

- `scripts/kaola-workflow-claim.js` (cmdClaim reorder, releaseSession state cleanup, cmdWatchPr sink filter removal)
- `scripts/kaola-workflow-sink-merge.js` (step 0 worktree removal, --untracked-files=no, merge-base catch)
- `hooks/kaola-workflow-pre-commit.sh` (HOOK_INPUT-gated INVOKED_CMD check)
