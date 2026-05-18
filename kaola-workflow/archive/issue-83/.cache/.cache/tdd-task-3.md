# TDD Task 3 (A3): Fix sink-mr.js — appendSummary existence guard (Bug 3)

## Modified Files
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

## RED Evidence
```
AssertionError [ERR_ASSERTION]: appendSummary should return false when parent dir missing
+ actual - expected
+ undefined
- false
```
Old `appendSummary` returned `undefined` (no return statement) and called `fs.mkdirSync`, recreating the archived directory.

## GREEN Evidence
```
GitLab sink tests passed
```

## Changes
1. Replaced `fs.mkdirSync(path.dirname(summaryFile), {recursive: true})` with `if (!fs.existsSync(path.dirname(summaryFile))) return false`
2. Added `return true` on success path
3. Added 2 Bug 3 test blocks (archived dir returns false, live dir returns true + file written)

## Deviations
None. Write set respected.
