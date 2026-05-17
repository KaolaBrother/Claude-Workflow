# Advisor Gate: Issue #40 — Blueprint Review

## Blocking Verification (from Phase 2 advisor gate)

### Question: Does `cmdClaim` call `provisionWorktree`?

**VERIFIED: YES** — `scripts/kaola-workflow-claim.js` line 1423:
```js
const wtResult = provisionWorktree(root, args.project, branch);
wtPath = wtResult.path;
```
This runs after lock acquisition + tiebreaker check (guarded by `!OFFLINE && hasGitHistory`).
`runBootstrapClaim` shells to `cmdClaim`, which calls `provisionWorktree`. The architect's B6 claimer
approach is **valid** — delegating to `runBootstrapClaim` correctly provisions the worktree.

## Blueprint Assessment

### selectFirstClaimable (Task B4) — VALID

Extraction boundary confirmed. The loop body in `runStartupClaimFirstAvailable` (line 1190) maps
cleanly to the `selectFirstClaimable` signature `(classifierScript, issues, claimer, sinks)`.
`sinks = sinks || { skipped: [], blocked: [] }` for backward compat.

Refactored `runStartupClaimFirstAvailable` becomes:
```js
function runStartupClaimFirstAvailable(claimScript, classifierScript, args, issues, skipped, blocked) {
  if (!fs.existsSync(classifierScript)) return { pick: null };
  return selectFirstClaimable(classifierScript, issues,
    (pick) => runBootstrapClaim(claimScript, args, pick),
    { skipped, blocked });
}
```

### cmdPickNext rewrite (Task B6) — CLARIFIED

**`expires:` field placement**: `updateSinkLease` (line 767) writes `expires:` into the `## Lease`
block. B6 must NOT add `expires:` to `## Current Position`. Instead, after `runBootstrapClaim`
succeeds, build a patchLock with `expires: now+24h` and call `updateSinkLease(stateFile, patchLock)`.
The `## Current Position` block already has `phase: 1, step: claimed` (written by `initialStateContent`
via `cmdClaim`).

**`ownedActiveProject` early-return**: Must be an explicit early-return block (not parenthetical).
Return structure: `{ verdict: 'owned', project, issue, session }`.

**Receipt fields** — `writeStartupReceipt` contract:
- `claim: 'acquired'` (not 'owned')
- `project`, `issue`, `selected_project`, `selected_issue` from the pick result
- `verdict` from classifyIssueCandidate (green/yellow)
- `startup_completed: true` (added by writeStartupReceipt automatically)

**Lock data for 24h expiry**: After claim, read the lock file written by `cmdClaim`, then merge:
```js
const patchLock = Object.assign({}, readJsonFile(lockPath(coordRoot, pick.project)), {
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  last_heartbeat: new Date().toISOString()
});
updateSinkLease(stateFile, patchLock);
```

### Return-shape verifications

All field names confirmed by source:
- `classifyIssueCandidate` → `{ issue, project, verdict, reasoning }` (line 1084)
- `fetchOpenIssueRecords` → `{ status, issues: [{number, ...}] }` (line 989)
- `ownedActiveProject` → `{ project, issue_number, source }` or `null` (line 402)
- `sortIssueRecords` → sorted array of issue records with `.number` field (line 955)

### validate-kaola-workflow-contracts.js variable name (Task B9)

Line 44: `const pluginRoot = 'plugins/kaola-workflow';` — lowercase `pluginRoot`, not `PLUGIN_ROOT`.
New assertions in B9 must use `pluginRoot` variable.

### Test case insertion (Tasks B7/B8/Phase A-3)

Cases 17L, 17M, 17N insert after Case 17J (line 4991), before `} finally {` (line 4993).
This is append-only and does not disrupt existing case ordering.

### archiveProjectDir idempotency (Task E-13)

`archiveProjectDir` (line 1701) already returns `{ skipped: 'source-missing' }` when src dir is
gone. This handles the double-archive case naturally. Non-blocking — no code change needed for
idempotency.

### removeWorktree CWD deferral (Task E-13)

`removeWorktree` (line 623) defers to `.pending-removal` when CWD is inside the worktree,
returning `{ deferred: true }`. Task E-13 must emit `removal: "deferred"` when this occurs and
`removal: "removed"` when line 662 returns `{ removed: true }`.

## Verdict

**APPROVED** — Blueprint is valid. All 4 pre-implementation requirements confirmed:
1. `cmdClaim` provisions worktrees ✓ (B6 claimer approach valid)
2. `expires:` goes in `## Lease` via `updateSinkLease` (not `## Current Position`) ✓
3. `pluginRoot` variable name confirmed ✓
4. Return shapes verified ✓

Proceed to `phase3-plan.md`.
