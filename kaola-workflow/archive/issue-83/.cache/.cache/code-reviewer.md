# Code Review: issue-83 — GitLab merge path archives before sink scripts finish

## Verdict: APPROVE

0 CRITICAL, 0 HIGH, 0 MEDIUM, 1 LOW

## File-by-file findings

### kaola-gitlab-workflow-sink-merge.js

`resolveProjectFile` is correctly private (absent from `module.exports`). The fallback logic is exact: live path first, archived path second, live path as last return so caller's existing `try/catch` handles the missing-file case. `readProjectInfo` and `finalValidationPassed` are mechanically identical to predecessors except the path computation delegates to `resolveProjectFile`. No issues.

### kaola-gitlab-workflow-claim.js (`cmdSinkFallback`)

`isSafeName` assert added at line 551, imported from `kaola-gitlab-workflow-active-folders.js` — no redefinition, consistent with every other guard in this file. The `existsSync(projectDir(...))` guard follows immediately, so path traversal is blocked before any filesystem check. Early return outputs `{updated: false, reason: 'project archived'}` and exits 0, matches spec and test assertions. `sink: mr` correct for GitLab.

### kaola-gitlab-workflow-sink-mr.js (`appendSummary`)

`mkdirSync` removal and `existsSync` guard replacement is the exact fix. `appendSummary` now returns `boolean`. Sole caller (`ensureMergeRequest`, line ~123) intentionally ignores return value — backward-compatible. Missing parent in archive scenario is the desired no-op.

### test-gitlab-sinks.js

Six new test blocks. Each uses own `tempRoot`, cleans up in `finally`, tests distinct failure modes. Bug 2 subprocess tests correctly use `KAOLA_WORKFLOW_OFFLINE: '1'`. Bug 1 indirect test for `readProjectInfo` validates `resolveProjectFile` end-to-end via forge stub asserting `project.project_id === 77`.

### simulate-gitlab-workflow-walkthrough.js

`testFallbackGuardsAfterArchive` sequences three steps in correct order. Byte-for-byte archive snapshot comparison is a strong regression guard. `finally` block cleans up unconditionally.

## Finding

**[LOW]** Missing state-file verification in the Bug 2 live-dir test

File: `test-gitlab-sinks.js` lines 275–294

The test asserts `parsed.updated === true` and `parsed.sink === 'mr'` from JSON output but does not read back `workflow-state.md` to verify `sink: mr` was actually written on disk. `updateState` is well-exercised elsewhere. A reader-assertion on the rewritten state file would make this test self-sufficient.

## Summary Table

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 0     | pass   |
| MEDIUM   | 0     | pass   |
| LOW      | 1     | note   |
