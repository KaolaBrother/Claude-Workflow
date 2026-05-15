# Final Validation: cross-machine-followups

## Command
`node scripts/simulate-workflow-walkthrough.js`

## Result
PASS — "Workflow walkthrough simulation passed" + exit 0

## Evidence
Run completed in Phase 6 step final-validation against final candidate state (post Phase 5 HIGH fix).

## Coverage
Hand-rolled test suite. No coverage tool. Suite exercises all 9 hardening items:
- L1/L2/MEDIUM-4/LOW-1/LOW-fd/I1: walkthrough invariance (suite passed before and after mechanical claim.js edits)
- LOW-2 SIGINT: async spawn, PID poll, SIGINT signal, assert exit 0 + PID file removed
- MEDIUM-2 (9B2): async spawn, PID poll, liveness probe (process.kill(pid,0)), SIGTERM, assert exit 0 + PID file removed
- LOW-3: corpus-grep loop across 12 shim files asserting verbatim canonical form
