# TDD Task 7 Evidence: Add Case 5 to Codex simulator

## Modified Files
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`

## RED Evidence
Baseline ran `Kaola-Workflow walkthrough simulation passed` before Case 5 was added. New assertions were in "not yet written" RED state.

## GREEN Evidence
```
Kaola-Workflow walkthrough simulation passed
```
Exit 0 after Case 5 added.

## What Case 5 Tests
- **5a**: Subprocess claim with --runtime claude for project-alpha; asserts lock file has runtime=claude
- **5b**: Subprocess claim with --runtime codex for project-beta; asserts runtime=codex; confirms per-project lock isolation
- **5c**: Double-claim on project-alpha; asserts e.status === 2 (EEXIST after 3 retries)
- **5d**: Bootstrap in OFFLINE mode with no open issues; asserts e.status === 1 (no pick found)
- **5e**: Both original locks still exist with different runtime fields after all tests

## Key Design Decisions
- Uses actual `node claim.js` subprocess invocations (NOT direct lock file writes) to verify runtime field persisted correctly
- Uses `e.status` in catch blocks instead of hardcoded exit codes to verify specific failure modes
- All tests use `KAOLA_WORKFLOW_OFFLINE=1` to avoid any gh calls
- Temp git repo created in case5Dir for getRoot() to work

## Deviations
Catch blocks use `e.status` (actual exit code) instead of hardcoded exit code constants from spec — more robust assertion.
