# TDD Task A — GitLab inline guard + dirty-worktree test

## Agent
tdd-guide

## Files Modified
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

## RED Evidence
AssertionError: dirty-worktree guard test: expected exit 1, got 0. stderr: ...
EXIT: 1 (test suite exited 1 because guard didn't exist yet — assertion on status === 1 failed)

## GREEN Evidence
```
dirty-worktree guard subprocess test passed
GitLab sink tests passed
EXIT: 0
```

## Diff Summary
- Inserted 2-line inline guard after fetch block at line 300 in kaola-gitlab-workflow-sink-merge.js
- Inserted dirty-worktree subprocess test block after line 568 in test-gitlab-sinks.js

## Implementation Commit
`0352e8e` on branch `workflow/issue-128` in worktree `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-128`

## Deviations
None.
