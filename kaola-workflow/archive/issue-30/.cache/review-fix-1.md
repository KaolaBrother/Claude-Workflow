# Fix 1: Legacy Lock Re-claim

## Bug

In `cmdClaim()`, the resume-detection block handled two cases — AC4 (existing worktree) and AC11 (missing worktree) — but had no branch for pre-Phase-4 locks that lack a `worktree_path` field entirely. A legacy lock causes execution to fall through to `issueAlreadyClaimed()`, which finds the same session/issue combination and returns `true`, causing exit 2. Any session that owned a project before the Phase-4 worktree upgrade cannot re-claim without first releasing.

## Fix

Added a third branch inside `if (existingLock && existingLock.session_id === args.session)` in `cmdClaim()` at `scripts/kaola-workflow-claim.js` (after the AC11 block):

```javascript
// Legacy: pre-Phase-4 lock has no worktree_path field — upgrade it in place
if (!existingLock.worktree_path) {
  const legacyBranch = buildSinkBranchName(
    args.issue != null ? args.issue : existingLock.issue_number,
    args.project,
    args.branch
  );
  let legacyWtPath = null;
  if (!OFFLINE) {
    // hasGitHistory check then provisionWorktree
    const wtResult = provisionWorktree(root, args.project, legacyBranch);
    legacyWtPath = wtResult.path;
  }
  const patchedLock = Object.assign({}, existingLock, { worktree_path: legacyWtPath, branch: legacyBranch });
  fs.writeFileSync(lp, JSON.stringify(patchedLock, null, 2) + '\n', { mode: 0o600 });
  updateSinkLease(stateFileLegacy, patchedLock);
  return;
}
```

Key properties of the fix:
- Uses `fs.writeFileSync` (not `wx`) to overwrite the pre-existing lock without EEXIST
- Preserves all original lock fields via `Object.assign` (`issue_number`, `claimed_at`, `claim_comment_id`, etc.)
- Skips `releaseSession` on `provisionWorktree` failure since no new lock was written in this path
- Respects `OFFLINE` mode: sets `worktree_path: null` when offline

## RED Evidence

Test 15G added to `scripts/simulate-workflow-walkthrough.js` before the `} finally {` of Epic Case 15. Before the fix:

```
Error: 15G (legacy): re-claim with legacy lock must exit 0, got 2
stderr:
    at assert (.../simulate-workflow-walkthrough.js:29:11)
```

Exit code 2 — the legacy lock fell through to `issueAlreadyClaimed` which found the same session+issue and blocked.

## GREEN Evidence

Two sub-cases after applying the fix:

**15G (OFFLINE):** Legacy lock re-claim with `KAOLA_WORKFLOW_OFFLINE=1`
- Exit 0
- Lock updated: `worktree_path` field present (null in offline mode, as expected)
- Lock updated: `branch` starts with `workflow/`
- `issue_number` (999) and `claimed_at` preserved

**15H (online):** Legacy lock re-claim with actual `provisionWorktree` execution
- Exit 0
- Lock updated: `worktree_path` is a non-empty string pointing to an existing directory
- Lock updated: `branch` starts with `workflow/`
- `issue_number` (888) and `claimed_at` preserved

Full suite output:
```
Workflow walkthrough simulation passed
```

Exit code: 0. All existing tests (Epics 1-16) continue to pass.
