# Code Architect Output — issue-120

## Design Decisions

- Verbatim copy (Option A): function body identical to GitHub source at `scripts/kaola-workflow-sink-merge.js:71-90`. No shared module extraction.
- Insertion point: immediately after `execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], ...)` in `runDirectMerge`, before the merge-base check. Mirrors GitHub call site at line 265.
- `assertNoLiveWorkflowFolder` is NOT added to legacy `fastForwardMain` / `skipGit` path. Guard only guards the new git pipeline (`options.skipGit` is false).
- `setupRepoWithLiveFolderOnBranch` must call `writeWorkflow(root, project, 1)` after returning to main — critical so `finalValidationPassed()` passes before the sink reaches the guard. Without this, the wrong error fires first.
- GitLab subprocess test passes `--root root` (matches existing convention at lines 410, 423, 444 of test-gitlab-sinks.js). Gitea test does NOT pass `--root`.

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` | Add `assertNoLiveWorkflowFolder` function; insert call after checkout on line 279 | 1 |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` | Add `assertNoLiveWorkflowFolder` function; insert call after checkout on line 280 | 1 |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` | Add `setupRepoWithLiveFolderOnBranch` helper + Test 20 before final console.log | 2 |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Add `setupRepoWithLiveFolderOnBranch` helper + guard test block before final console.log | 2 |

## Files to Create

None.

## Build Sequence

1. Tasks 1 and 2 (Group A — sink edits, parallel, disjoint files)
2. Tasks 3 and 4 (Group B — test edits, parallel, disjoint files; logically after Group A)
3. Validate: run both test files

All four can technically be edited in parallel since write sets are disjoint.

## Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 1, 2 | Disjoint sink files |
| B | 3, 4 | Disjoint test files |
| All | 1, 2, 3, 4 | All files disjoint — can be one parallel batch |

## Task List

### Task 1: Gitea sink — add guard function and call site
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js`
- Write Set: function definition block; one call-site line after checkout
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement:
  1. Insert `assertNoLiveWorkflowFolder` function verbatim between `assertCleanWorktree` and `fastForwardMain`
  2. After checkout line 279, add: `assertNoLiveWorkflowFolder(mainRoot, args.project);`
- Mirror: `scripts/kaola-workflow-sink-merge.js:71-90` (function) and line 265 (call site)
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

### Task 2: GitLab sink — add guard function and call site
- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- Write Set: function definition block; one call-site line after checkout
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement: identical to Task 1 (same function body, same insertion pattern at line 280)
- Mirror: same GitHub source
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

### Task 3: Gitea test — add helper + Test 20
- File: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`
- Write Set: new helper function after `setupRealRepo`; new test block before `console.log('Gitea sink tests passed')`
- Depends On: Task 1 (guard must exist)
- Parallel Group: B
- Action: MODIFY
- Implement:
  1. Add `setupRepoWithLiveFolderOnBranch` helper after `setupRealRepo`. CRITICAL: must call `writeWorkflow(root, project, 1)` after `git checkout main` — without it `finalValidationPassed()` fails first with wrong error.
  2. Append Test 20 block before `console.log('Gitea sink tests passed')` — NO `--root` flag (Gitea convention)
  3. Assert: `result.status === 1` AND `result.stderr.includes('sink-merge refused:')`
- Mirror: Test 19 pattern from issue #119 (subprocess spawn, KAOLA_WORKFLOW_OFFLINE, dual assertion)
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

### Task 4: GitLab test — add helper + guard test block
- File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Write Set: new helper function after `setupRealRepo`; new test block before `console.log('GitLab sink tests passed')`
- Depends On: Task 2
- Parallel Group: B
- Action: MODIFY
- Implement:
  1. Same `setupRepoWithLiveFolderOnBranch` helper with `writeWorkflow(root, project, 1)` call
  2. Append guard test block before `console.log('GitLab sink tests passed')` — MUST pass `--root root` (GitLab convention, lines 410, 423, 444)
  3. Same dual assertion pattern
- Mirror: existing GitLab subprocess tests at lines 410, 423, 444
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

## Required Imports Audit

| File | fs | path | spawnSync | execFileSync | writeWorkflow |
|------|----|------|-----------|--------------|---------------|
| test-gitea-sinks.js | line 5 | line 7 | line 8 | line 8 | line 50 (local) |
| test-gitlab-sinks.js | line 5 | line 7 | line 8 | line 8 | line 51 (local) |

No new imports needed in any file.

## Critical Note on setupRepoWithLiveFolderOnBranch

After `git checkout main`, the live folder committed only on the feature branch is no longer on disk. `finalValidationPassed()` reads `phase6-summary.md` from disk — if absent, it returns false and the sink exits 1 with a validation error BEFORE reaching `assertNoLiveWorkflowFolder`. The fix: call `writeWorkflow(root, project, 1)` after checkout to main, so `phase6-summary.md` exists on disk and the guard is reached.
