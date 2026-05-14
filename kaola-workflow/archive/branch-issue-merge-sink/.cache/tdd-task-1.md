# TDD Task 1 — Modify kaola-workflow-claim.js

## Status: COMPLETE

## Modified Files
- `scripts/kaola-workflow-claim.js`

## RED Evidence
- Append path: `branch: TBD` (before implementation)
- In-place path: `branch: TBD` (before implementation)

## GREEN Evidence
- Append path: `branch: workflow/issue-4-demo`
- In-place path: `branch: workflow/issue-4-demo`
- Spec example: `branch: workflow/issue-4-branch-issue-merge-sink`
- patch-branch state file: `branch: workflow/issue-4-demo-custom`
- patch-branch lock file: `lock.branch: workflow/issue-4-demo-custom`

## Validation
```
node scripts/simulate-workflow-walkthrough.js && node scripts/validate-workflow-contracts.js
```
Result: PASS — "Workflow walkthrough simulation passed" + "Workflow contract validation passed"

## Changes
- Change A: branchName computed in updateSinkLease; append path and in-place path both write real branch name
- Change B: --branch added to parseArgs
- Change C: cmdPatchBranch function added; dispatch + usage assert updated

## Deviations
None
