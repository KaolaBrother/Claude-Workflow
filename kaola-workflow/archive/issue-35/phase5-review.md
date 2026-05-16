# Phase 5 - Review: issue-35

## Code Review Findings

### CRITICAL
none

### HIGH
- **HIGH-1** (FIXED): `issueFetch.issues = sortIssueRecords(...)` mutated the returned object in-place in `cmdStartup`. Fixed by introducing `const sortedIssues` and updating all three downstream references.
- **HIGH-2** (FIXED): Epic Case 14a did not test `workflow:queued` beating a P0 issue. Fixed by adding issue 305 (`workflow:queued`, no P-label) to the stub and asserting it is claimed first over P0 issue 304.

### MEDIUM/LOW
- MEDIUM-1: New cases named "14a/14b" collide with original "14A/14B/14C" sub-labels — ambiguous on failure. Deferred.
- MEDIUM-2: Double sort (fetchOpenIssueRecords sorts then cmdStartup re-sorts with opts). Harmless, deferred.
- MEDIUM (re-review): `gh issue view` stub in 14a returns empty labels for all numbers; fragility if claim path re-fetches by number. Pre-existing pattern, not a regression.
- LOW-1: `PRIORITY_TIER_BY_LABEL` lacks prototype guard. Neutralized by numeric comparison. Deferred.
- LOW-2: `parsePriorityTier` called twice per sort comparison — O(N log N) calls. Deferred.
- LOW-3: Contract check for `ranking` is file-wide string scan. Deferred.
- Security LOW-1: No file size bound on readFileSync. Local DoS only. Deferred.
- Security LOW-2: Silent error swallow in safeReadLabels masks non-ENOENT failures. Deferred.

## Security Review
ran: yes — filesystem access (readPriorityConfig reads two config file paths)

### Findings
No CRITICAL, HIGH, or MEDIUM security findings. Path construction uses fixed literal segments; label values never used in shell commands, path construction, or HTML rendering. Error handling is fail-secure (ENOENT → []). Two LOW operational quality notes (file size bound, silent catch) — not blockers.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | Filesystem access in readPriorityConfig |
| review-fix executors | invoked | .cache/review-fix-1.md | HIGH-1 and HIGH-2 both fixed |
| advisor critical gate | N/A | — | No CRITICAL findings |

## Fixes Applied
1. HIGH-1: `cmdStartup` now uses immutable `sortedIssues` variable; `issueFetch` object never mutated
2. HIGH-2: Epic Case 14a now includes issue 305 (`workflow:queued`) and asserts it beats P0; ranking length updated to 5

## Validation Evidence
- `node scripts/simulate-workflow-walkthrough.js` → exit 0, "Workflow walkthrough simulation passed" (post-fix, confirmed by orchestrator and re-review agent)
- Re-review by code-reviewer: APPROVED, no new CRITICAL/HIGH

## Follow-Up Items
- MEDIUM-1: Rename new cases to Epic 15a/15b or 14d/14e to avoid label collision with original 14A/14B/14C
- MEDIUM-2: Pass opts through fetchOpenIssueRecords to eliminate double sort
- LOW-1: Add prototype guard to PRIORITY_TIER_BY_LABEL lookup
- LOW-2: Pre-compute parsePriorityTier results before sort
- Security LOW-2: Log non-ENOENT errors to stderr in safeReadLabels

## Review Status
PASSED WITH FOLLOW-UPS
