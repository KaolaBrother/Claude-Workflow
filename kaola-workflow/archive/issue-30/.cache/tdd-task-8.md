TDD Task 8: PR-2 Worktree Provisioning and Lifecycle Management

## RED Phase Evidence

Before any changes, ran `node scripts/simulate-workflow-walkthrough.js`. Output: "Workflow walkthrough simulation passed" (exit 0). This is the baseline — all existing Epic Cases 1-14 and LOW tests pass before PR-2 changes.

## Changes Made

### scripts/kaola-workflow-claim.js

**Functions Added (Tasks 8-9):**

1. `worktreePathFor(root, project)` — Computes the worktree path as `<dirname(root)>/<basename(root)>.kw/<project>`. Placed before `buildSinkBranchName`.

2. `provisionWorktree(root, project, branch)` — Creates a git worktree at the computed path. Handles: existing worktree detection (resume AC4), branch-exists check (add vs. add -b), and returns `{ path: wtPath }`. Placed immediately after `worktreePathFor`.

3. `removeWorktree(coordRoot, project, lock)` — Removes a worktree on PR merge/close/release. Handles: missing `worktree_path` (skip), ENOENT (already removed), CWD-protection with correct `cwdReal.startsWith(wtReal + path.sep)` comparator (deferred removal), clean vs dirty check (force-remove vs abandon with timestamp suffix). Placed after `provisionWorktree`.

4. `drainPendingRemovals(coordRoot)` — Processes `.pending-removal/*.json` files created by CWD-protected deferred removals. Placed after `removeWorktree`.

**buildLockData() update (Task 10 prerequisite):**
Added `worktree_path: null` and `branch: null` fields to the returned lock data object.

**cmdClaim() rewrite (Task 10):**
- Added resume-detection block BEFORE `writeLockFile`: reads existing lock, checks `session_id` match, handles AC4 (worktree exists → resume), AC11 (worktree missing → loud failure with recovery instructions).
- Added `worktree_path` + `branch` to `finalLock` via `Object.assign`.
- Added `provisionWorktree` call AFTER tiebreaker check (no worktree on yield).
- Guard: `!OFFLINE` AND `git rev-parse HEAD` succeeds (has git history). This handles two edge cases found in existing tests: (a) Epic 6G uses gh shim without OFFLINE=1 but has no `.git` directory, (b) Epic 12D uses `git init` with no commits so HEAD is invalid.
- Failure of `provisionWorktree` is fatal: calls `releaseSession`, sets exitCode 2, returns.

**cmdWatchPr() wiring (Task 11):**
- Added `try { removeWorktree(coordRoot, lock.project, lock); } catch (_) {}` BEFORE `releaseSession` in both MERGED and CLOSED branches.

**cmdSweep() extension (Task 12):**
- After the sweep loop, added: `git worktree prune` call (catches stray worktree registrations), then `drainPendingRemovals(coordRoot)` call.

**module.exports update (Task 9 continued):**
- Changed from `{ buildSinkBranchName }` to `{ buildSinkBranchName, getCoordRoot, removeWorktree }`.

## Key Implementation Decisions

**OFFLINE guard refinement:** The spec suggested `if (!OFFLINE)` around `provisionWorktree`. Two existing tests fail with a naive guard:
- Epic 6G: bootstrap with gh shim, `KAOLA_WORKFLOW_OFFLINE` not set, but `epic6Tmp` is not a git repo. Fixed by also checking `git rev-parse HEAD` succeeds.
- Epic 12D: bootstrap with `KAOLA_WORKFLOW_OFFLINE: ''` (falsy), `epic12Tmp` is `git init` with no commits. HEAD is invalid. Same `git rev-parse HEAD` check covers this.

**releaseSession signature:** The spec snippet had a bug — `releaseSession(coordRoot, ...)`. The actual function is `releaseSession(root, coordRoot, sessionId, reason, options)`. Used the correct 5-arg form.

**CWD-protection comparator:** Used `cwdReal.startsWith(wtReal + path.sep)` not bare `startsWith(wtReal)` to avoid false matches on paths like `/tmp/wt-foo` vs `/tmp/wt`.

## GREEN Phase Evidence

After all changes: `node scripts/simulate-workflow-walkthrough.js` exits 0 with "Workflow walkthrough simulation passed". All existing Epic Cases 1-14 and LOW tests pass.

## Files Modified

- `scripts/kaola-workflow-claim.js` — all changes listed above
