# Planner Output — Issue #85

## Recommendation: Option A — Three separate test functions

1. `testE2EGitHubMergeFullChain` — startup → worktree-finalize → finalize --keep-worktree → sink-merge → assert archive + no worktree + clean main
2. `testE2EGitHubPrFullChain` — startup → worktree-finalize → finalize --keep-worktree → sink-pr → assert archive + pr_url + clean worktree
3. `testParallelIssueIndependence` — two startups → finalize one → assert other unaffected

GitLab E2E: document out of scope (no OFFLINE guard in GitLab claim/sink scripts).

## Key Facts Verified

- Existing helpers: `initGitRepo`, `writeGhShimForStartup`, `runClaimOnline` (all exist)
- `startup` requires ONLINE mode (gh shim) to provision worktrees via `git worktree add`
- `worktree-finalize` subcommand copies main-worktree active folder to linked worktree and commits
- `finalize --keep-worktree` archives main-worktree active folder, preserves linked worktree
- `sink-merge` must be invoked from `cwd = wtPath` (linked worktree) and handles `removeWorktree` itself
- `sink-pr` reads state from `getRoot()` → when cwd=wtPath, reads mirrored artifacts from linked worktree
- Real FF-merge needed in E2E test (not a stub)
- OFFLINE mode for sink scripts (no push/fetch)

## Exact Assertions

### testE2EGitHubMergeFullChain (issues 850)
1. startup claim==='acquired'; wtPath exists
2. Feature commit added on wtPath
3. worktree-finalize exit 0; wtPath/kaola-workflow/issue-850/workflow-state.md exists
4. finalize --keep-worktree exit 0; archive exists at tmp/kaola-workflow/archive/issue-850; main copy gone; wtPath still exists
5. sink-merge exit 0; main SHA === featureHead; workflow/issue-850 branch deleted; wtPath gone; git status clean

### testE2EGitHubPrFullChain (issue 860)
1. startup claim==='acquired'; wtPath exists
2. phase6-summary.md written to main active folder
3. worktree-finalize exit 0; mirrored artifacts in wtPath
4. finalize --keep-worktree exit 0; archive exists; wtPath still exists
5. sink-pr (cwd=wtPath) exit 0; workflow-state.md contains pr_url:; git status clean in wtPath

### testParallelIssueIndependence (issues 870, 871)
1. Two startups → both acquired, disjoint worktrees
2. Feature commit on 870's branch
3. worktree-finalize 870; finalize --keep-worktree 870; sink-merge 870 (cwd=wt870)
4. issue-871 active folder still exists; wt871 still exists; wt871 workflow-state.md unchanged; wt871 branch still present; wt870 branch deleted

## Not-build list

- No Codex variant changes (sync-forbidden)
- No GitLab E2E tests (no OFFLINE guard)
- No new test framework
- No refactoring of existing helpers (inline if needed)
- No new flags to cmdFinalize
- CHANGELOG: append under [Unreleased] only (no new version section)
