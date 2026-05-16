# TDD Fix 3-1: field() regex cross-line boundary bug

## Failure Identified By
Task 3 (Epic Case 5G-d): blank `workflow_project:` field should cause exit 1, but `cmdProjectName` exited 0 because `field()` returned the next line's content.

## Root Cause
`field()` used `':\\s*(.+)$'` with multiline flag. `\\s*` matches newlines, so on a blank value:
```
workflow_project: \n
next_step: ready\n
```
The regex consumed the trailing ` \n` via `\\s*` then matched `next_step: ready` as `(.+)`.

## Fix Applied
In all 4 files, changed `\\s*` to `[ \\t]*` (horizontal whitespace only):
- `scripts/kaola-workflow-roadmap.js` line 11
- `plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` line 11
- `scripts/kaola-workflow-claim.js` line 23
- `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` line 23

## Validation
- `node scripts/simulate-workflow-walkthrough.js` → exit 0, "Workflow walkthrough simulation passed"
- `diff -u scripts/kaola-workflow-roadmap.js plugins/kaola-workflow/scripts/kaola-workflow-roadmap.js` → no output
- `diff -u scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` → no output
