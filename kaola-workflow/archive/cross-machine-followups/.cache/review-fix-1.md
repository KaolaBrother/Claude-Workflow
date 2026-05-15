# Review Fix 1 — HIGH: Remove SIGHUP handler + DRY signal handlers

## Finding
HIGH: SIGHUP handler in `cmdTicker` overwrites `nohup`'s inherited `SIG_IGN`, making the ticker killable by SIGHUP and undermining daemon survivability.

## Fix Applied
`scripts/kaola-workflow-claim.js`:
- Removed `process.on('SIGHUP', ...)` handler
- Extracted `gracefulShutdown()` local function (closes over `pidPath`)
- Replaced inline SIGTERM and SIGINT handlers with `process.on('SIGTERM', gracefulShutdown)` and `process.on('SIGINT', gracefulShutdown)`

`scripts/simulate-workflow-walkthrough.js`:
- Removed the 37-line `test9B_SIGHUP` block
- `test9B_SIGINT` remains (SIGINT is a legitimate clean-shutdown signal)

## RED Evidence
N/A — this removes a behavior that should not exist. The SIGHUP handler was the bug; absence is correct.

## GREEN Evidence
- `grep -n "SIGHUP" scripts/kaola-workflow-claim.js` → no output (handler removed)
- `node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed" exit 0

## Status
HIGH finding resolved.
