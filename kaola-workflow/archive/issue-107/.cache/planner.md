# Planner Output — issue-107

## Files to Touch (2)
1. `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-repair-state.js` — line 295: add guard before Phase 6 route
2. `plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` — append 2 new test blocks before final async call

## Production Change (file 1)

Replace line 295:
```js
// BEFORE
if (artifact(projectDir, 'phase5-review.md')) return route(root, workflowDir, project, 6, artifact(projectDir, 'phase5-review.md'), undefined, true);

// AFTER
if (artifact(projectDir, 'phase5-review.md')) {
  if (phase4 && !allPhase4TasksComplete(readFile(phase4))) {
    return { reason: 'phase5-review.md exists but phase4-progress.md still has open tasks' };
  }
  return route(root, workflowDir, project, 6, artifact(projectDir, 'phase5-review.md'), undefined, true);
}
```

Notes:
- `allPhase4TasksComplete` defined at line 134, in scope
- `readFile` used at line 297 in same function, available
- `phase4` declared at line 293, in scope
- GitLab `route()` signature: `route(root, workflowDir, project, phase, phaseFile, task, crossesBoundary)` — do NOT copy GitHub's arg order

## Test Change (file 2)

Add before line 921 (`testGitLabRoadmapInitIssueExclusiveAndUpdate()`):

Test 1 (negative guard — the bug fix):
- Write phase4-progress.md with open task + phase5-review.md
- Assert `reconstruct()` returns no `nextCommand` and reason contains 'open tasks'
- Assert `repair()` does not write `phase: 6` to workflow-state.md

Test 2 (positive regression — happy path still works):
- Write phase4-progress.md with complete task + phase5-review.md
- Assert `reconstruct()` returns `phase: 6` and nextCommand matches `/kaola-workflow-phase6`

## Acceptance Check
```bash
npm run test:kaola-workflow:gitlab
node scripts/simulate-workflow-walkthrough.js
```
Both must exit 0.

## Out of Scope
- `scripts/kaola-workflow-repair-state.js` (GitHub, already correct)
- Unifying route() signatures between GitHub and GitLab
- Refactoring reconstruct() or stateContent() beyond the guard insertion
- Changing test harness wiring or package.json
