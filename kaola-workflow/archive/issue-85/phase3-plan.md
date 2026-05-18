# Phase 3 - Plan: issue-85

## Blueprint

### Files to Create

None.

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `scripts/simulate-workflow-walkthrough.js` | Add 3 new test functions + 3 calls in `main()` | E2E regression coverage |
| `CHANGELOG.md` | Append entry under `[Unreleased]` | User-visible change |

### Build Sequence

1. Write all three test functions in `scripts/simulate-workflow-walkthrough.js`
2. Add three bare calls in `main()` after `testReadPriorityConfig()`, before final `console.log`
3. Append CHANGELOG.md entry
4. Run `node scripts/simulate-workflow-walkthrough.js` to validate exit 0

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Task 1 (all functions + main + changelog) | single task; all output in same two files |

### External Dependencies

None. All imports already present in the file.

---

## Task List

### Task 1: Add Three E2E Test Functions

- File: `scripts/simulate-workflow-walkthrough.js`, `CHANGELOG.md`
- Test File: `scripts/simulate-workflow-walkthrough.js` (is itself the test)
- Write Set: `scripts/simulate-workflow-walkthrough.js`, `CHANGELOG.md`
- Depends On: none
- Parallel Group: A (serial; single file)
- Action: MODIFY
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0 and prints "Workflow walkthrough simulation passed"

#### Function 1: `testE2EGitHubMergeFullChain`

Issue number: 850. All sync. Uses `writeGhShimForStartup`.

Chain:
1. `initGitRepo(tmp)` + `writeGhShimForStartup(binDir)`
2. `runClaimOnline(['startup', '--target-issue', '850'], tmp, binDir)` → assert `claim === 'acquired'`; capture `wt850 = result.worktree_path`; assert `wt850` exists
3. Feature commit in `wt850`: write `feature-850.txt`, `git add`, `git commit`
4. `runClaimOnline(['worktree-finalize', '--project', 'issue-850'], tmp, binDir)` → assert `finalized === true`; assert `wt850/kaola-workflow/issue-850/workflow-state.md` exists
5. `spawnSync(node, [claimScript, 'finalize', '--project', 'issue-850', '--keep-worktree'], { cwd: wt850, env: {OFFLINE=1} })` → assert exit 0; assert `wt850/kaola-workflow/archive/issue-850` exists; assert `tmp/kaola-workflow/issue-850` absent; assert `wt850` still exists
6. Capture `featureHead = git rev-parse workflow/issue-850` (from tmp)
7. `spawnSync(node, [sinkMergeScript, '--project', 'issue-850', '--branch', 'workflow/issue-850', '--issue', '850'], { cwd: wt850, env: {OFFLINE=1} })` → assert exit 0
8. Assert `git rev-parse main` (from tmp) === `featureHead`
9. Assert `git branch --list workflow/issue-850` (from tmp) === `''`
10. Assert `wt850` does NOT exist
11. Assert `git status --porcelain --untracked-files=no` (from tmp) === `''`

Cleanup: `finally { rmSync(tmp, recursive); rmSync(kwRoot, recursive) }`

#### Function 2: `testE2EGitHubPrFullChain`

Issue number: 860. All sync. Uses custom gh shim (handles both startup + `pr view`).

Key design decisions:
- Pass `{ KAOLA_SINK: 'pr' }` as extraEnv to startup → main worktree `workflow-state.md` starts with `sink: pr`
- `--runtime` flag omitted (consistent with existing startup tests)
- `sink-pr` OFFLINE writes `pr_url: OFFLINE_PLACEHOLDER` only to linked worktree copy
- Must copy linked worktree state back to main worktree before `watch-pr` (cmdWatchPr reads main worktree; skips folders with no `pr_url`)
- Add comment: `// test-only: mirror linked-worktree state to main; production runs sink-pr before finalize from main worktree`
- `watch-pr` via `runClaimOnline` (OFFLINE=0; cmdWatchPr returns immediately if OFFLINE=1)
- Custom gh shim `pr view` returns `state: "MERGED"` → archive path `archive/issue-860` (no timestamp suffix)

Chain:
1. `initGitRepo(tmp)` + write custom gh shim to `binDir`
2. `runClaimOnline(['startup', '--target-issue', '860'], tmp, binDir, { KAOLA_SINK: 'pr' })` → assert `claim === 'acquired'`; capture `wt860`
3. `runClaimOnline(['worktree-finalize', '--project', 'issue-860'], tmp, binDir)` → assert `finalized === true`; assert `wt860/kaola-workflow/issue-860/` exists
4. Write `wt860/kaola-workflow/issue-860/phase6-summary.md` (required by sink-pr `appendSummary`); `git add -A` + commit if diff cached
5. `spawnSync(node, [sinkPrScript, '--branch', 'workflow/issue-860', '--project', 'issue-860', '--issue', '860'], { cwd: wt860, env: {OFFLINE=1} })` → assert exit 0
6. Assert `wt860/kaola-workflow/issue-860/workflow-state.md` contains `pr_url:`
7. Assert `git -C wt860 status --porcelain --untracked-files=no` === `''`
8. `// test-only: mirror linked-worktree state to main; production runs sink-pr before finalize from main worktree`; copy linked state to `tmp/kaola-workflow/issue-860/workflow-state.md`
9. `runClaimOnline(['watch-pr'], tmp, binDir)` → assert `watched === 1`
10. Assert `tmp/kaola-workflow/archive/issue-860` exists
11. Assert `tmp/kaola-workflow/issue-860` does NOT exist
12. Assert `wt860` does NOT exist

Cleanup: `finally { rmSync(tmp, recursive); rmSync(kwRoot, recursive) }`

#### Function 3: `testParallelIssueIndependence`

Issue numbers: 870, 871. All sync. Uses `writeGhShimForStartup`.

Chain:
1. `initGitRepo(tmp)` + `writeGhShimForStartup(binDir)`
2. `runClaimOnline(['startup', '--target-issue', '870'], tmp, binDir)` → assert `claim === 'acquired'`; capture `wt870`
3. `runClaimOnline(['startup', '--target-issue', '871'], tmp, binDir)` → assert `claim === 'acquired'`; capture `wt871`; assert `wt870 !== wt871`; assert both exist
4. Feature commit in `wt870` only: write `feature-870.txt`, `git add`, `git commit`
5. `runClaimOnline(['worktree-finalize', '--project', 'issue-870'], tmp, binDir)` → assert `finalized === true`
6. `spawnSync(node, [claimScript, 'finalize', '--project', 'issue-870', '--keep-worktree'], { cwd: wt870, env: {OFFLINE=1} })` → assert exit 0
7. Capture `feature870Head = git rev-parse workflow/issue-870` (from tmp)
8. `spawnSync(node, [sinkMergeScript, '--project', 'issue-870', '--branch', 'workflow/issue-870', '--issue', '870'], { cwd: wt870, env: {OFFLINE=1} })` → assert exit 0
9. Capture `mainAfter = git rev-parse main`; assert `mainAfter === feature870Head`
10. Assert `git branch --list workflow/issue-870` === `''`
11. Assert `wt870` does NOT exist
12. Assert `tmp/kaola-workflow/issue-871` EXISTS
13. Assert `wt871` EXISTS
14. Assert `tmp/kaola-workflow/issue-871/workflow-state.md` contains `status: active`
15. Assert `git branch --list workflow/issue-871` !== `''`

Cleanup: `finally { rmSync(tmp, recursive); rmSync(kwRoot, recursive) }`

#### Insertion in `main()`

After `testReadPriorityConfig()`, before `console.log('Workflow walkthrough simulation passed')`:
```js
    testReadPriorityConfig();
    testE2EGitHubMergeFullChain();
    testE2EGitHubPrFullChain();
    testParallelIssueIndependence();
    console.log('Workflow walkthrough simulation passed');
```

#### CHANGELOG entry

Under `## [Unreleased]`:
```
- test: add E2E regression coverage for GitHub merge/PR closure and parallel-issue independence (issue #85); GitLab E2E remains out of scope pending OFFLINE support in GitLab scripts
```

---

## Advisor Notes

From `.cache/advisor-plan.md`:
- Dead variable `feature870Head` fixed: assert `mainAfter === feature870Head` after sink-merge 870
- `assertCleanWorktree` uses `--untracked-files=no` — verified safe
- PR test workaround: add one-line comment above `fs.writeFileSync(mainStateFile, linkedState)`
- Drop `--runtime claude` for consistency with existing startup tests
- CHANGELOG entry text specified above
- No re-architect needed

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | advisor fixes applied directly to phase3-plan.md | No re-architect needed; fixes are mechanical (dead var, comment, drop --runtime flag) |
