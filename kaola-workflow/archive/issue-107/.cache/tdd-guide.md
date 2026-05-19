# TDD Guide Output — issue-107

## RED phase
Test 1 (negative guard) failed as expected:
```
AssertionError [ERR_ASSERTION]: guard must not route to Phase 6 when Phase 4 tasks are open
```

## Fix Applied
`plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-repair-state.js` line 295 — expanded phase5-review.md branch with open-tasks guard:
```js
if (artifact(projectDir, 'phase5-review.md')) {
  if (phase4 && !allPhase4TasksComplete(readFile(phase4))) {
    return { reason: 'phase5-review.md exists but phase4-progress.md still has open tasks' };
  }
  return route(root, workflowDir, project, 6, artifact(projectDir, 'phase5-review.md'), undefined, true);
}
```

## Tests Added
`plugins/kaola-workflow-gitlab/scripts/test-gitlab-workflow-scripts.js` — two blocks inserted before line 921:
- Test 1 (negative guard): open Phase 4 task → reconstruct() returns reason mentioning "open tasks", repair() does not write phase: 6
- Test 2 (positive regression): complete Phase 4 task → reconstruct() still routes to phase 6

## GREEN phase
```
npm run test:kaola-workflow:gitlab → GitLab workflow script tests passed / GitLab workflow walkthrough simulation passed / GitLab Codex workflow walkthrough simulation passed
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed
```

## Worktree
Changes made in: /Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-107/
