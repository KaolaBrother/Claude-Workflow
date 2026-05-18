# TDD Task 1 (A1): Fix sink-merge.js — archive-aware path resolution (Bug 1)

## Modified Files
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

## RED Evidence
```
AssertionError [ERR_ASSERTION]: finalValidationPassed should return true from archive fallback
false !== true
    at Object.<anonymous> (.../test-gitlab-sinks.js:184:12)
```

## GREEN Evidence
```
GitLab sink tests passed
```

## Changes
1. Inserted private `resolveProjectFile(root, project, basename)` helper after `field` function
2. Updated `readProjectInfo` to use `resolveProjectFile(root, project, 'workflow-state.md')`
3. Updated `finalValidationPassed` to use `resolveProjectFile(root, project, 'phase6-summary.md')`
4. Added `testFinalValidationPassedArchived` and `testRunDirectMergeAfterArchive` tests

## Deviations
None. Write set respected.
