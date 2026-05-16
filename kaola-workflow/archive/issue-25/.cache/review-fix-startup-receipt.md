# Review Fix - Startup Receipt Handoff Blocker

## Finding

`startupReceiptHandoffBlocker()` treated all `claim: "none"` receipts as neutral
before validating that the receipt was complete and belonged to the requested
session.

## Classification

MEDIUM correctness risk.

## Fix

Validate `startup_completed` and receipt `session` first. Only a valid
same-session `claim:none` receipt is neutral for guarded stale recovery.

## Verification

- `node --check scripts/kaola-workflow-claim.js`
- `node --check plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- `node scripts/validate-workflow-contracts.js`
- `node scripts/validate-kaola-workflow-contracts.js`
- `node scripts/simulate-workflow-walkthrough.js`
- `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
