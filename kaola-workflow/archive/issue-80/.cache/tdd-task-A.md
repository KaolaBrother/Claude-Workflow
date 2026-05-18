# TDD Task A — Extend test regression guard

## Result: GREEN

## File Modified
- `scripts/simulate-workflow-walkthrough.js` — inserted issue-604 startup+release block inside `testFinalizeReleaseCleansWorktree`

## RED Evidence
N/A — pure test addition. `cmdRelease` already accepts any reason string; this adds a regression guard confirming `--reason git-freshness-block` works end-to-end.

## GREEN Evidence
`node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed" (exit 0)

## Deviations
None — edit in main repo file, not worktree (correct; this is a shared script).
