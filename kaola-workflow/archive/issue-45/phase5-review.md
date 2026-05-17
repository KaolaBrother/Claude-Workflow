# Phase 5 - Review: issue-45

## Code Review Findings

### CRITICAL
none

### HIGH
none

### MEDIUM/LOW

**MEDIUM-1** (RESOLVED): cmdStartup worktree_path in receipt lacked direct startup test. Resolved by test 17W (tdd-guide agent, commit 4e27e4e).

**MEDIUM-2** (RESOLVED): KAOLA_WORKTREE_PATH exported without `-d` existence check in two SKILL.md sites. Resolved via TIE: both sites updated to `[ -n "$KAOLA_WORKTREE_PATH" ] && [ -d "$KAOLA_WORKTREE_PATH" ] && export KAOLA_WORKTREE_PATH` (commit 2ea71c6).

**LOW-1**: P2-A incomplete-status regex covers only `pending` and `in[_-]progress`. Acceptable for current production vocabulary. Noted for future awareness; does not block.

## Security Review

ran: yes — files touch filesystem (rmdirSync, rmSync, readdirSync), external API (gh issue view +state), and lock file reads.

### Findings

**Security-M1** (pre-existing, NOT introduced by issue-45): `issue_number` not re-validated on lock read before `ghExec`. Pre-existing at cmdStatus/cmdSweep/cmdWatchPr. CLI flag injection not possible via execFileSync array args; only defense-in-depth concern for tampered lock files. Tracked as future follow-up separate from this issue.

**Security-M2**: worktree_path from lock into bash SKILL.md — reviewer confirmed variable is correctly double-quoted at all usage sites. Residual newline risk theoretical only. No defect.

All path traversal, naming collision, and injection concerns evaluated as not exploitable.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | filesystem + external API calls in diff |
| review-fix executors | invoked | commit 4e27e4e (tdd-guide 17W), commit 2ea71c6 (TIE MEDIUM-2) | |
| advisor critical gate | N/A | no CRITICAL findings | |

## Fixes Applied

1. TIE: Added `[ -d "$KAOLA_WORKTREE_PATH" ]` guard to both SKILL.md export sites (MEDIUM-2)
2. tdd-guide: Test 17W added — direct `startup` call asserting `worktree_path` in receipt (MEDIUM-1)

## Validation Evidence

- `node scripts/simulate-workflow-walkthrough.js` → **PASSED** (all 17P–17W)
- `node scripts/validate-script-sync.js` → **OK: 7 common scripts in sync**
- Cited from Phase 4 validation (same test suite, no new breaking changes)

## Follow-Up Items

- Security-M1: Add `Number.isFinite` re-validation guard for `issue_number` at cmdStatus/cmdSweep/cmdWatchPr ghExec call sites. Low practical risk (requires lock file write access). Future issue.
- LOW-1: P2-A regex extension to cover non-standard status values if vocabulary expands.

## Review Status
PASSED WITH FOLLOW-UPS
