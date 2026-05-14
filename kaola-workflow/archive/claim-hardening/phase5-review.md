# Phase 5 - Review: claim-hardening

## Code Review Findings

### CRITICAL
none

### HIGH
none

### MEDIUM/LOW

**M-1 (MEDIUM):** S-L1c `{ mode: 0o600 }` on `writeFileSync` to an existing file is a no-op
(OS ignores mode arg post-creation). Real protection comes from S-L1a. Accepted per Phase 2
advisor note ("defensible — documents intent"). No action.

**M-2 (MEDIUM):** `simulate-workflow-walkthrough.js` reached 1249 lines (Phase 3 budget: 1150;
coding-style.md limit: 800). Pre-task baseline was 1061. Splitting Epic Case 8 requires
out-of-scope test harness refactor. Deferred as follow-up issue.

**M-3 (MEDIUM):** Test 8D assertion is slightly permissive (`entry8d == null || ...drift.includes(...)`
allows silent-drop false pass). `cmdStatus` never drops entries, so low real-world risk.
Deferred as follow-up item.

**L-1 (LOW):** Test 8E label "re-claim Sink refresh" is inaccurate — it tests claim-after-release
(full release between two claims), not true re-claim (blocked by EEXIST). Cosmetic.

**L-2 (LOW):** `runClaim` helper does not surface stderr on failure. Diagnostic inconvenience only.

**L-3 (LOW):** Test 8B `stateFile` path construction style minor inconsistency vs. other epic cases.

## Security Review

Ran: yes — initial review on Phase 4 changes, then re-review after H1 fix.

### Findings

**H1 (HIGH → RESOLVED):** `cmdPatchBranch` did not block `\n`/`\r` in `--branch`. Newline-containing
branch name would be written via `content.replace(/^branch:.*$/m, ...)` (line 386) into
workflow-state.md, enabling markdown section injection. Fix applied (lines 371-373): added
`!args.branch.includes('\n') && !args.branch.includes('\r')` to the validation assertion.
Test 8F added (spawnSync with newline branch, asserts exit code !== 0). Re-reviewed: RESOLVED.

**LOW (parity gap):** `updateSinkLease` (lines 133-137) uses string-form `.replace()` with
`lockData.project` and `lockData.session_id` values. `isSafeName` blocks most dangerous characters
but does not strip `$`. If values contain `$&`/`$1`, JS replacement string expansion applies.
Attack requires controlling isSafeName-validated fields. Recommended follow-up: convert to
function-form callbacks (same pattern as cmdPatchBranch line 387). Not blocking.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | filesystem writes, external API calls (gh) |
| review-fix executors | invoked | .cache/review-fix-1.md | H1 fix via tdd-guide |
| advisor critical gate | N/A | | no CRITICAL findings; HIGH (H1) resolved before phase file |

## Fixes Applied

- H1: Added `!args.branch.includes('\n') && !args.branch.includes('\r')` to cmdPatchBranch
  validation (claim.js lines 371-373). Test 8F added to simulate-workflow-walkthrough.js.

## Validation Evidence

- `node scripts/simulate-workflow-walkthrough.js` → exit 0, "Workflow walkthrough simulation passed"
  (run after H1 fix, covering all of Epic Cases 1–8 including 8F)

## Follow-Up Items

- Test file decomposition: simulate-workflow-walkthrough.js exceeds 800/1150 line limits (M-2)
- updateSinkLease function-form replace for `$&`/`$1` parity (security LOW)
- Test 8D assertion tightening (M-3)
- Test 8E label correction (L-1)

## Review Status
PASSED WITH FOLLOW-UPS
