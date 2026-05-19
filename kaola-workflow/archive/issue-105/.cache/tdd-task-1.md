# TDD Task 1 — Phase 4 Results

## RED Evidence

Command: `node scripts/simulate-workflow-walkthrough.js` (from worktree, before any changes)

Failure:
```
Error: sink-merge should exit 0
stdout: 
stderr: 切换到分支 'workflow/issue-850'
sink-merge refused: kaola-workflow/issue-850/workflow-state.md still exists on branch HEAD.
Run finalize before sink-merge, then recommit. Two remediation paths:
  Path A (worktree available): cd <worktree> && node <claim.js> finalize --project issue-850 --keep-worktree
    then git add kaola-workflow/ && git commit -m "chore: archive issue-850" on the feature branch
  Path B (worktree gone): git rm -r kaola-workflow/issue-850/ on the feature branch, commit, then re-run sink-merge

    at assert (...simulate-workflow-walkthrough.js:18:25)
    at testE2EGitHubMergeFullChain (...simulate-workflow-walkthrough.js:1064:5)
```

Test `testE2EGitHubMergeFullChain` failed at the sink-merge step because
`cmdFinalize --keep-worktree` did not commit the archive to the feature branch.
The live folder remained in the branch HEAD, triggering the `assertNoLiveWorkflowFolder`
guard added in `kaola-workflow-sink-merge.js`.

## Files Changed

### 1. `scripts/kaola-workflow-claim.js`

`cmdFinalize` expanded: the `args.keepWorktree` branch now detects whether execution
is in a linked worktree (by comparing `mainRootFromCoord(getCoordRoot(root))` to
`root`). If so, it runs:
```
git -C <root> add -A kaola-workflow/
git -C <root> commit -m "chore: archive <project>"
```
This commits the archive to the feature branch HEAD so sink-merge's guard passes.
`execFileSync` was already imported at line 6; no new imports added.

Lines changed: `cmdFinalize` body (lines ~441-452 expanded to ~462).

### 2. `scripts/simulate-workflow-walkthrough.js`

**Change B** (after line 1054, before `// Capture feature HEAD`):
Added assertions that verify `finalize --keep-worktree` committed the archive
to the feature branch:
- `live workflow-state.md must NOT be in feature branch HEAD after finalize --keep-worktree`
- `kaola-workflow/archive/issue-850 must exist in feature branch HEAD after finalize --keep-worktree`

Uses `spawnSync('git', ['cat-file', '-e', 'HEAD:...'])` for tree-level checks.

**Change A** (after `gitStatus === ''` assertion, before `console.log('testE2EGitHubMergeFullChain: PASSED')`):
Added assertions that verify sink-merge FF-merged the correct state into main:
- `live workflow folder must be absent from main after sink-merge`
- `archive folder must be present in main after sink-merge`

Uses `fs.existsSync` on `path.join(tmp, 'kaola-workflow', 'issue-850')` and
`path.join(tmp, 'kaola-workflow', 'archive', 'issue-850')`.

## GREEN Evidence

```
testReadPriorityConfig: PASSED
testE2EGitHubMergeFullChain: PASSED
testE2EGitHubPrFullChain: PASSED
testParallelIssueIndependence: PASSED
Workflow walkthrough simulation passed
```

Exit code: 0

## Deviations

None. All changes match the plan exactly.
- `testSinkMergeRefusesLiveFolder` was not modified (already correct).
- `assertNoLiveWorkflowFolder` in sink-merge.js was not modified (already correct).
- No new imports added to claim.js.
- No commits created (working tree only, as required).
