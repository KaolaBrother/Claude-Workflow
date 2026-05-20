# Phase 3 - Plan: issue-120

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` | Add `assertNoLiveWorkflowFolder` function + call after checkout | Port GitHub guard (line 279 gap) |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` | Same | Port GitHub guard (line 280 gap) |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` | Add `setupRepoWithLiveFolderOnBranch` helper + Test 20 | Subprocess guard assertion |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Add same helper + guard test block | Subprocess guard assertion |

### Build Sequence
1. Tasks 1 and 2 (Group A — sink edits, fully parallel, disjoint files)
2. Tasks 3 and 4 (Group B — test edits, fully parallel, disjoint files; logically after Group A)
3. Validate: run both test files

All 4 tasks have disjoint write sets and can be done in one parallel batch.

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 1, 2 | Disjoint sink scripts |
| B | 3, 4 | Disjoint test files |
| All | 1, 2, 3, 4 | All 4 files are disjoint — single parallel batch |

### External Dependencies
None. `execFileSync`, `fs`, `path` already imported in all 4 files. No new packages.

## Task List

### Task 1: Gitea sink — add assertNoLiveWorkflowFolder
- File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js`
- Write Set: function definition (between `assertCleanWorktree` and `fastForwardMain`); one call-site line after checkout at line 279
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement:
  1. Insert `assertNoLiveWorkflowFolder` function verbatim (see GitHub source `scripts/kaola-workflow-sink-merge.js:71-90`) between closing `}` of `assertCleanWorktree` and `function fastForwardMain`
  2. After line 279 (`execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], ...)`), insert: `assertNoLiveWorkflowFolder(mainRoot, args.project);`
- Mirror: `scripts/kaola-workflow-sink-merge.js:71-90` (function) and line 265 (call site)
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

### Task 2: GitLab sink — add assertNoLiveWorkflowFolder
- File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- Write Set: same as Task 1 (at line 280 in GitLab file)
- Depends On: none
- Parallel Group: A
- Action: MODIFY
- Implement: identical function body and call-site insertion pattern as Task 1
- Mirror: same GitHub source
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

### Task 3: Gitea test — add helper + Test 20
- File: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`
- Write Set: `setupRepoWithLiveFolderOnBranch` helper after `setupRealRepo`; Test 20 block before `console.log('Gitea sink tests passed')`
- Depends On: Task 1 (guard must exist for test to be meaningful)
- Parallel Group: B
- Action: MODIFY
- Implement:
  1. Add `setupRepoWithLiveFolderOnBranch(name, project)` after `setupRealRepo`:
     - Calls `setupRealRepo(name, project)` → `{ root, branch }`
     - `git checkout branch`
     - `fs.mkdirSync(dir, { recursive: true })` + write `workflow-state.md` to feature branch dir
     - `git add kaola-workflow/` + `git commit -m 'accidentally committed live folder'`
     - `git checkout main`
     - CRITICAL: `writeWorkflow(root, project, 1)` — restores `phase6-summary.md` on main's disk so `finalValidationPassed()` passes before the guard is reached
     - Returns `{ root, branch }`
  2. Append Test 20 block before `console.log('Gitea sink tests passed')`:
     - Spawn: `process.execPath [sinkScript, '--project', project, '--branch', branch]` — NO `--root` (Gitea convention)
     - Env: `KAOLA_WORKFLOW_OFFLINE: '1'`
     - Assert: `result.status === 1` AND `result.stderr.includes('sink-merge refused:')`
- Mirror: Test 19 subprocess pattern from issue #119 (KAOLA_WORKFLOW_OFFLINE, dual assertion)
- Validate: `node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

### Task 4: GitLab test — add helper + guard test block
- File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Write Set: same helper + guard test block before `console.log('GitLab sink tests passed')`
- Depends On: Task 2
- Parallel Group: B
- Action: MODIFY
- Implement:
  1. Same `setupRepoWithLiveFolderOnBranch` helper with `writeWorkflow(root, project, 1)` call
  2. Guard test block: MUST pass `--root root` (GitLab convention, matches lines 410, 423, 444)
     - Same dual assertion: `result.status === 1` AND `result.stderr.includes('sink-merge refused:')`
- Mirror: existing GitLab subprocess tests at lines 410, 423, 444
- Validate: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

## Advisor Notes
All three advisor concerns verified:
1. `writeWorkflow(root, project, 1)` writes `phase6-summary.md` with content satisfying `finalValidationPassed` — confirmed from source (test-gitea-sinks.js:68).
2. `finalValidationPassed` runs at line 235 (before checkout at line 279) — confirmed from sink source.
3. `writeWorkflow` call after `git checkout main` is necessary: `git add kaola-workflow/` + commit puts BOTH `workflow-state.md` and `phase6-summary.md` on the feature branch; checkout back to main removes them from disk.
4. `setupRealRepo` uses `git init -b main` — `master`-default concern dismissed.

Blueprint approved with no gaps.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Advisor approved blueprint; no gaps requiring revision |
