# TDD Task 5 — Modify install.sh

## Status: COMPLETE

## Modified Files
- `install.sh`

## RED Evidence
`grep 'kaola-workflow-sink-merge.js' install.sh` returned exit 1 (no match) before change.

## GREEN Evidence
After change, loop reads:
```bash
for script_file in \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-repair-state.js \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-claim.js \
  "$SOURCE_SCRIPTS_DIR"/kaola-workflow-sink-merge.js; do
```

## Validation
- `simulate-workflow-walkthrough.js`: PASSED
- `validate-workflow-contracts.js`: FAILED on pre-existing stale assertion (Task 6 will fix)

## Deviations
None
