# Phase 4 - Progress: issue-63

## Completed

- Added `kaola-workflow-active-folders.js` and mirrored it to the Codex plugin.
- Replaced legacy durable coordination with active-folder based startup, status, resume, finalize, discard, and sink behavior.
- Updated classifier overlap logic to use active workflow folders.
- Updated sink behavior to read active folders.
- Removed prompt boilerplate for legacy heartbeat/startup receipt/session ownership.
- Updated validators and simulators to assert the new contract.
- Fixed mirror drift for `validate-workflow-contracts.js`.
- Fixed `kaola-workflow-fast` Codex skill wording so the contract still anchors state under `kaola-workflow/{project}/workflow-state.md`.

## Validation

- `node scripts/validate-script-sync.js`: pass.
- `node scripts/validate-workflow-contracts.js`: pass.
- `node scripts/validate-kaola-workflow-contracts.js`: pass.
- `npm test`: pass.
- `git diff --check`: pass.

## Notes

#64 remains a separate active worktree and was not modified here.
