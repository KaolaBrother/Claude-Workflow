# TDD Task 5 (C1): Add testFallbackGuardsAfterArchive integration test

## Modified Files
- `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js`

## RED Evidence
N/A — new integration test; production fixes (A1+A2+A3) already applied. Test passes immediately.

## GREEN Evidence
```
testFallbackGuardsAfterArchive: PASSED
GitLab workflow walkthrough simulation passed
```

## Changes
1. Added `fs`, `os`, `spawnSync`, `assert`, `sinkMr`, `claimScript` imports/constants
2. Added `testFallbackGuardsAfterArchive()` function testing:
   - `sink-fallback` returns `{updated: false, reason: 'project archived'}` on archived project
   - `appendSummary` returns false and does not recreate live dir
   - Archive directory is byte-for-byte unchanged after dispatch chain
3. Called `testFallbackGuardsAfterArchive()` before `run(...)` calls

## Deviations
None. Write set respected.
