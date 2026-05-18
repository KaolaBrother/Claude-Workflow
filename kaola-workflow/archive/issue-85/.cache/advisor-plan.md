# Advisor — Plan Gate: Issue #85

## Verdict: Proceed after fixes

Blueprint is sound. Three blocking items addressed before Phase 4:

### Item 1 (BLOCKING): Dead variable `feature870Head` in testParallelIssueIndependence
**Fix**: Add assertion `assert(mainAfter === feature870Head, ...)` after sink-merge 870 in the parallel test.

### Item 2 (BLOCKING): Verify `assertCleanWorktree` precondition for sink-merge
**Verified**: `assertCleanWorktree` at line 64 of sink-merge.js uses `--untracked-files=no`.
After `finalize --keep-worktree` removes `tmp/kaola-workflow/issue-850/`, git status with
`--untracked-files=no` will show clean. Precondition is met. No fix needed.

### Item 3 (BLOCKING): PR test workaround must be commented
**Fix**: Add one-line comment above the `fs.writeFileSync(mainStateFile, linkedState)` line:
`// test-only: mirror linked-worktree state to main; production runs sink-pr before finalize from main worktree`

## Non-blocking items resolved

- `claimScript`, `sinkMergeScript`, `sinkPrScript`: confirmed at lines 10, 13, 14
- `runClaimOnline` 4th extraEnv arg: confirmed functional at line 406
- `--runtime claude`: drop from new tests for consistency with testStartupJsonAndSiblingWorktrees (line 429)
- CHANGELOG entry text added to phase3-plan.md

## Other findings

- `assertCleanWorktree` uses `--untracked-files=no` — confirmed safe
- Build sequence: correct (single task, all three functions in one file)
- No dependency ordering issues between the three test functions
- Advisor confirmed no re-architect needed
