# TDD Task 4 — Modify workflow-next.md

## Status: COMPLETE

## Modified Files
- `commands/workflow-next.md`

## RED Evidence
`grep 'Branch:' commands/workflow-next.md` returned exit 1 (no match) before change.

## GREEN Evidence
After change: `grep -n 'Branch:' commands/workflow-next.md` returns:
```
188:Branch: {branch from Sink block in workflow-state.md, or TBD if not yet claimed}
```

## Validation
- `simulate-workflow-walkthrough.js`: PASSED
- `validate-workflow-contracts.js`: FAILED on pre-existing stale assertion `## Step 8 - Commit And Push` (Task 6 will fix)

## Deviations
None
