# TDD Task 1 - Guarded Handoff and Startup Verification

## RED

Regression gaps identified before implementation:

- Direct `handoff` could overwrite an active lock without checking local owner
  liveness.
- Phase prompts could proceed with a `claim:none` startup receipt because the
  receipt guard was prose-only.
- Simulations did not cover receipt mismatch or `claim:none` verifier rejection.

## GREEN

Implemented:

- `verify-startup`
- `can-handoff`
- guarded `handoff`
- local Claude JSONL, ticker PID, unexpired lock, and heartbeat blockers
- owned startup receipt write after successful handoff
- root and packaged simulation regressions

## Validation

- `node --check scripts/kaola-workflow-claim.js`
- `node --check plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
- `node --check scripts/simulate-workflow-walkthrough.js`
- `node --check plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `node scripts/validate-workflow-contracts.js`
- `node scripts/validate-kaola-workflow-contracts.js`
- `node scripts/simulate-workflow-walkthrough.js`
- `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`
- `npm test`
- `git diff --check`
