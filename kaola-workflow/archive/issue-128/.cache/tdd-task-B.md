# TDD Task B — Gitea inline guard + dirty-worktree test

## Agent
tdd-guide

## Files Modified
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js`
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

## RED Evidence
AssertionError: dirty-worktree guard test: expected exit 1, got 0. stderr: [git checkout output, no guard]
EXIT: 1 (test suite exited 1 because guard didn't exist yet)

## GREEN Evidence
```
live-folder guard subprocess test passed
dirty-worktree guard subprocess test passed
auto-merge config-true trigger test passed
auto-merge config-false skip test passed
auto-merge HOME-stub config file test passed
Gitea sink tests passed
EXIT: 0
```

## Diff Summary
- Inserted 2-line inline guard after fetch block at line 299 in kaola-gitea-workflow-sink-merge.js
- Inserted Test 21 dirty-worktree subprocess test block after line 535 in test-gitea-sinks.js (no --root flag, Gitea convention)

## Implementation Commit
`ed4a953` on branch `workflow/issue-128` in worktree `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-128`

## Deviations
None.
