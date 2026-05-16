# Advisor Plan Gate Output — issue-28

## Decision: Blueprint approved with one blocker correction

### Blocker: cmdWatchPr backward-compatibility regression

The architect's Change 2A-5 proposed:
```js
const branchName = buildSinkBranchName(lock.issue_number, lock.project, lock.branch);
```

This is NOT equivalent to the original. `buildSinkBranchName` ignores `fallbackBranch` when
`issueNumber != null` — so `lock.branch` would be discarded for any issue-backed lock.
This breaks backward compatibility: existing locks with `branch: workflow/issue-28-issue-28`
(including this session's own lock) would have their stored branch silently overridden.

**Corrected Change 2A-5:**
```js
const branchName = lock.branch || buildSinkBranchName(lock.issue_number, lock.project);
```

Rationale: `lock.branch` wins when it is already stored (legacy or corrected). Only compute
a fresh branch name when the lock has no stored branch yet.

### Secondary: buildSinkBlock consistency

The architect's Change 2A-2 used `lockData.branch || buildSinkBranchName(...)` which is the
correct priority order but inverts the parameter usage vs the `fallbackBranch` slot.
For consistency and clarity, the recommended form is:
```js
const branchName = buildSinkBranchName(lockData.issue_number, lockData.project, lockData.branch);
```
This passes `lockData.branch` as `fallbackBranch` — the helper handles `null` issueNumber by
returning `fallbackBranch || 'workflow/' + project`, so this is safe.

### Verifications completed

- `os` imported at line 3 of `simulate-workflow-walkthrough.js` ✅
- `cmdInitIssue` defaults `workflow_project` to `'—'` when `--workflow-project` omitted
  (line 192: `const workflowProject = (args['workflow-project'] || '—').replace(...)`) ✅
  Epic Case 5G-b (init-issue without --workflow-project → placeholder → exit 1) is safe.

### No architect revision cycle needed

The correction is a single-line substitution in Change 2A-5 and a clarification of
Change 2A-2's intent. Record in phase3-plan.md and proceed to Phase 4.

## Action Items Applied
1. Corrected Change 2A-5 (cmdWatchPr): `lock.branch || buildSinkBranchName(lock.issue_number, lock.project)`
2. Clarified Change 2A-2 (buildSinkBlock): `buildSinkBranchName(lockData.issue_number, lockData.project, lockData.branch)`
3. Both verifications (os import, cmdInitIssue default) confirmed before Phase 4
