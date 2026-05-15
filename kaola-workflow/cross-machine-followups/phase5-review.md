# Phase 5 - Review: cross-machine-followups

## Code Review Findings

### CRITICAL
None.

### HIGH
**SIGHUP handler conflicted with nohup daemon survivability** (FIXED)
`scripts/kaola-workflow-claim.js` — `process.on('SIGHUP', ...)` registered in `cmdTicker` overwrote `nohup`'s inherited `SIG_IGN` via libuv `sigaction()`, making the ticker killable by SIGHUP. All 12 shims launch with `nohup + disown` specifically for SSH-disconnect survivability. Fix: removed SIGHUP handler; extracted `gracefulShutdown()` local function; SIGTERM and SIGINT now share it. SIGHUP sub-test in walkthrough removed.

### MEDIUM/LOW

**MEDIUM — DRY violation in signal handlers (FIXED as part of HIGH fix)**
Three identical inline signal bodies extracted to `gracefulShutdown()`.

**LOW — Stale comment in test 9B2**
`simulate-workflow-walkthrough.js`: comment says "Write lock file with a real issue_number" but code passes `null`. Misleads future maintainers. Deferred as cosmetic follow-up.

**LOW — Test file size (pre-existing)**
`simulate-workflow-walkthrough.js` exceeds 800-line project maximum (now ~1820 lines after SIGHUP sub-test removal). Pre-existing violation. The `test9B_SIGINT` and eventual Epic-9 extraction are deferred.

## Security Review

Ran: yes — `scripts/kaola-workflow-claim.js` touches filesystem, signal handlers, and git operations.

### Findings

- **L1 g-flag (LOW)**: `updateLeaseInPlace` regex replacements are unscoped to Lease block. No current attack vector; acceptable.
- **L2 `--` separator (INFO)**: Correct hardening. Clean.
- **MEDIUM-4 stderr (INFO)**: Git error messages may contain remote URL. Pre-existing misconfiguration risk only. Acceptable.
- **LOW-2 signal handlers (INFO)**: No injection opportunity. `pidPath` closure-captured from `isSafeName`-validated input. Clean.
- **I1 Number.isFinite (INFO)**: Improvement. Clean.
- **Shim kill -0 pattern (INFO)**: `$_TICKER_PID_FILE` derives from trusted sources. Tampered content causes benign re-spawn only. Clean.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | security-sensitive files: filesystem, signals, git |
| review-fix executors | invoked | .cache/review-fix-1.md | HIGH + MEDIUM fixed via tdd-guide |
| advisor critical gate | N/A | no CRITICAL findings | |

## Fixes Applied

1. Removed `process.on('SIGHUP', ...)` handler from `cmdTicker` in `scripts/kaola-workflow-claim.js`
2. Extracted `gracefulShutdown()` function; SIGTERM and SIGINT share it
3. Removed `test9B_SIGHUP` sub-test from `scripts/simulate-workflow-walkthrough.js`

## Validation Evidence

- `node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed" exit 0 (after HIGH fix)
- Command: `node scripts/simulate-workflow-walkthrough.js`
- Evidence: phase4-progress.md (prior passing runs for T1/T2/T3) + post-fix run confirms fix did not regress anything

## Follow-Up Items

- LOW: Stale comment "Write lock file with a real issue_number" in test 9B2 (passes `null`)
- LOW: `simulate-workflow-walkthrough.js` file size violation (pre-existing; `test9B_SIGINT`/SIGHUP sub-test duplication should eventually be parameterized)

## Review Status
PASSED WITH FOLLOW-UPS
