# TDD Task 1 — claim.js fixes + async main() + LOW-2 signal tests

## Modified Files
- `scripts/kaola-workflow-claim.js`
- `scripts/simulate-workflow-walkthrough.js`

## Changes

### kaola-workflow-claim.js
- L1: added `g` flag to both regex replaces in `updateLeaseInPlace` (lines 183–184)
- L2: added `--` separator to git push in `handleTiebreakerYield` (line 228)
- MEDIUM-4: replaced `catch (_) {}` with `catch (e) { process.stderr.write('adoption push failed: ' + e.message + '\n'); }` (line 231)
- LOW-1: removed dead tautology — `if (!match || match.session_id !== tickCtx.session)` → `if (!match)` (line 467)
- LOW-fd: changed `return fd` → `return true` in `acquirePidFile` (line 459)
- LOW-2: added SIGINT and SIGHUP handlers after SIGTERM handler (lines 527–528)
- I1: changed `match.issue_number` truthy check → `Number.isFinite(match.issue_number)` (line 494)

### simulate-workflow-walkthrough.js
- Added `spawn` to child_process destructure
- Added `sleep` and `waitExit` helper functions above `main()`
- Converted `function main()` → `async function main()`
- Changed `main()` call → `main().catch(e => { console.error(e); process.exitCode = 1; })`
- Added LOW-2 SIGINT sub-test (test9B_SIGINT) — async spawn, poll 100ms×30, send SIGINT, assert exit 0 + PID file removed
- Added LOW-2 SIGHUP sub-test (test9B_SIGHUP) — same shape, SIGHUP signal

## RED Evidence
- SIGINT sub-test failed before adding handlers: `Error: SIGINT test: ticker exited with code null, expected 0`
- L1/L2/MEDIUM-4/LOW-1/LOW-fd/I1: RED N/A — mechanical fixes validated by walkthrough invariance

## GREEN Evidence
```
Workflow walkthrough simulation passed
exit code: 0
```
Command: `node scripts/simulate-workflow-walkthrough.js`

## Deviations
None. Only approved write-set files modified.
