# TDD Task 2 — MEDIUM-2 liveness test rewrite

## Modified Files
- `scripts/simulate-workflow-walkthrough.js`

## Changes
Replaced Test 9B2 block (spawnSync-based weak assertion) with async liveness test:
- `spawnSync` → `spawn` (async)
- Poll loop: 100ms × 30 iterations until PID file changes from '99999999'
- Liveness: `process.kill(newPid9b2, 0)` — asserts ticker is still alive
- SIGTERM + `waitExit(child9b2, 3000)` — clean shutdown
- Assert `result9b2.code === 0` + PID file removed
- try/finally: `child9b2.kill('SIGKILL')` on any failure path

## RED Evidence
Agent demonstrated: probing `r9b2.pid` directly after spawnSync gives:
```
RED EVIDENCE - AssertionError: 9B2: spawnSync child PID is dead by assertion time (RED): ESRCH
```
The child is dead by the time spawnSync returns — liveness assertion on corpse is impossible.

## GREEN Evidence
```
Workflow walkthrough simulation passed
exit code: 0
```
Command: `node scripts/simulate-workflow-walkthrough.js`

## Note on Application
Task 2 ran in a worktree that didn't include Task 1's SIGINT/SIGHUP tests. The MEDIUM-2 block was applied to the main tree (which already has Task 1) via Edit tool transfer of the verified agent output. Validation confirmed both Task 1 and Task 2 changes pass together.

## Deviations
None. Only approved write-set file modified.
