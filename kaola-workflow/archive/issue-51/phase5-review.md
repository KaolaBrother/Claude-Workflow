# Phase 5 - Review: issue-51

## Code Review Findings

### CRITICAL
none

### HIGH
none

### MEDIUM
1. **B7b deviation needs inline rationale comment** — `scripts/kaola-workflow-claim.js:2640` — the documented `args.session || ''` choice (vs. `currentSessionId(args, {fallback:false})`) is invisible to future readers. **Status: FIXED via Trivial Inline Edit** — comment added above the `explicitSession` assignment explaining the test-17D constraint and the read-only nature of `cmdResume`.
2. **Plugin pre-commit hook not tracked by validate-script-sync** — `plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh` (new copy) is byte-identical to `hooks/kaola-workflow-pre-commit.sh` today, but `validate-script-sync.js` only enforces sync for `COMMON_SCRIPTS` (.js files). Future drift would not be caught. **Status: FIXED via Trivial Inline Edit** — added a "HOOK PARITY NOTE" block to the `validate-script-sync.js` comment header documenting the manual sync requirement. Adding a hook-sync check is a follow-up (LOW priority); for now the comment + identical-at-creation state is acceptable.

### MEDIUM/LOW
- **LOW (code-reviewer)**: `removeWorktree` in `closedFastPath` is structurally outside the `!OFFLINE && lock.issue_number != null` block but `closedFastPath` itself requires both conditions. No behavior difference; latent refactoring hazard. Note only.
- **LOW (code-reviewer)**: `cmdFinalize` revert is documented and AC3 coverage is complete via `cmdSweep`+`cmdWatchPr`+`cmdWorktreeFinalize`. Note only.
- **LOW (code-reviewer)**: `isIssueClosed` adds one `gh issue view` call per non-synthetic lock per sweep. Acceptable for correctness; future optimization (batch/cache) deferred.
- **LOW (code-reviewer)**: `claimExplicitTarget` closed guard placement (before `issueAlreadyClaimed`) is correct user-facing behavior.

## Security Review

ran: yes — touched files include session ownership logic, GitHub API call construction, lock file lifecycle, worktree removal, and a pre-commit hook copy.

### CRITICAL
none

### HIGH
none

### MEDIUM
1. **closedFastPath missing `isSafeName` validation** — `scripts/kaola-workflow-claim.js:2125–2161` — `cmdSweep`'s new closed-fast-path calls `removeWorktree(coordRoot, lock.project, lock)` without validating `lock.project` or `lock.session_id`. Parallel code in `cmdWatchPr` at `:2348–2349` does validate. Defense-in-depth gap (compounding preconditions: attacker would need to forge a `.lock` file AND make `gh issue view N` report CLOSED). **Status: FIXED via Trivial Inline Edit** — added `if (lock.project && !isSafeName(lock.project)) continue;` and `if (lock.session_id && !isSafeName(lock.session_id)) continue;` at the top of the lock loop, matching the `cmdWatchPr` pattern. Mechanically obvious, copy of existing security idiom, no test impact (synthetic-prefixed session IDs pass `isSafeName`).

### MEDIUM/LOW
- **LOW (security)**: `cmdResume` ownership guard is identity-assertion not identity-verification. Attacker with knowledge of target session ID can pass `--session=<that-id>`. Known limit of the threat model (session IDs are stored in plain-text lock files). Prior `main` had NO guard; this is strictly additive. Note only.
- **LOW (security)**: Pre-commit hook duplication creates drift surface. Both files byte-identical today. Documented in `validate-script-sync.js` HOOK PARITY NOTE (MEDIUM #2 fix above). Hook-sync CI check is a follow-up.
- **LOW (security)**: Epic 20B (and related) tests use `KAOLA_OFFLINE: '1'` but `claim.js` reads `KAOLA_WORKFLOW_OFFLINE`. If gh is reachable on the system PATH in test environments without a shim, tests could make live calls. Currently every Epic 20* uses a gh shim so the risk is theoretical. **Status: NOTED, not fixed** — env var name normalization is a follow-up cleanup that doesn't gate Phase 6.

### Affirmative findings (security)
- No hardcoded secrets in the diff.
- All `gh` calls use array-form `execFileSync` via `ghExec`. No template-string shell construction.
- `String(lock.issue_number)` and `String(targetIssue)` coercions before gh invocation.
- `isIssueClosed` returns `false` on OFFLINE/parse/gh error (fail-closed for destructive operations).
- `archiveProjectDir` validates `isSafeName(project)`; sweep second-pass validates `isSafeName(entry.name)`.
- `cmdWorktreeFinalize` `remoteCleanup` flip is guarded by session ownership check at `:2789–2796`.
- Ticker `KAOLA_KERNEL_SESSION_SKIP=1` bypass scope is limited to ancestry check; `enforcePlatformSessionOrExit` is independently gated.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | touched files involve session ownership, GitHub API calls, lock files, worktree removal, pre-commit hook |
| review-fix executors | invoked (Trivial Inline Edit Exception applied) | this file + git diff on scripts/kaola-workflow-claim.js, scripts/validate-script-sync.js | All three MEDIUM fixes were mechanical: one comment add, one comment add, one copy of existing security pattern. No tdd-guide/build-error-resolver delegation required. |
| advisor critical gate | N/A | no CRITICAL findings | |

## Fixes Applied

1. **scripts/kaola-workflow-claim.js:2146–2148**: added two `isSafeName(lock.X)` continue guards at top of `cmdSweep` lock loop (security M-1 fix).
2. **scripts/kaola-workflow-claim.js:2638–2641**: added 4-line comment block above `explicitSession` assignment in `cmdResume` explaining the B7b deviation rationale (code-reviewer M-1 fix).
3. **scripts/validate-script-sync.js:33–39**: added HOOK PARITY NOTE comment block documenting the byte-identical-required relationship between `hooks/kaola-workflow-pre-commit.sh` and `plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh` (code-reviewer M-2 fix).
4. **plugins/kaola-workflow/scripts/kaola-workflow-claim.js**: re-synced to mirror scripts/kaola-workflow-claim.js after fix #1 and #2.

## Validation Evidence

Post-fix validation (all GREEN):

| Command | Result |
|---------|--------|
| `node scripts/simulate-workflow-walkthrough.js` | PASS — Workflow walkthrough simulation passed |
| `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | PASS — Kaola-Workflow walkthrough simulation passed |
| `node scripts/validate-script-sync.js` | PASS — OK: 7 common scripts in sync |
| `node scripts/validate-workflow-contracts.js` | PASS — Workflow contract validation passed |
| `node scripts/validate-kaola-workflow-contracts.js` | PASS — Kaola-Workflow contract validation passed |

Per Validation De-Duplication policy: same five commands ran post-Phase-4 (recorded in `phase4-progress.md` validation snapshot). The Phase 5 fixes were strictly additive (comments + defensive guards that fail-skip on safe inputs), so re-running was the correct (and minimal) verification.

## Follow-Up Items

Filed for follow-up (LOW priority, NOT blocking #51 close):

1. **Hook-sync CI check**: extend `validate-script-sync.js` with a `COMMON_HOOKS` array or equivalent so `hooks/kaola-workflow-pre-commit.sh` and `plugins/kaola-workflow/hooks/kaola-workflow-pre-commit.sh` drift can be detected automatically.
2. **`KAOLA_OFFLINE` vs `KAOLA_WORKFLOW_OFFLINE` env-var naming**: simulation tests use `KAOLA_OFFLINE: '1'` but production code reads `KAOLA_WORKFLOW_OFFLINE`. Tests rely on gh shims to mask the mismatch. Normalize to one name.
3. **`isIssueClosed` per-lock gh call optimization**: cache the closed-state lookup within a single sweep run if performance becomes a concern.
4. **`cmdResume` ownership guard hardening**: revisit whether `KAOLA_SESSION_ID` env-var should be considered authoritative identity (currently NOT promoted to claim, intentionally, to avoid test 17D regression). Defer until test 17D itself is revisited.

These are tracked here as Phase 5 follow-up items; Phase 6 may decide whether to file separate GitHub issues for each or roll them into the existing #N2 (prompt footprint) issue if scope-adjacent.

## Review Status

PASSED WITH FOLLOW-UPS (3 MEDIUM findings all fixed inline; 4 LOW follow-ups deferred).
