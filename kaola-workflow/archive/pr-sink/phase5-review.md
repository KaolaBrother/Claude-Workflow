# Phase 5 - Review: pr-sink

## Code Review Findings

### CRITICAL
None.

### HIGH
- H1 (FIXED): Trailing-slash regex `/\/pull\/(\d+)\//` in `kaola-workflow-sink-pr.js:156` caused `prNumber` to always be `0` against real `gh pr create` output (no trailing slash in real URLs). Fixed to `/\/pull\/(\d+)/`. Test shim also updated to emit URL without trailing slash.

### MEDIUM/LOW
- M1 (DEFERRED): `args.branch` refspec characters `+` and `:` not rejected in sink-pr.js branch validation. Low risk at call site (branch comes from lock file, not CLI). Follow-up issue.
- L1: `lock.branch` in `git branch -D` — mitigated by `--` separator. No action.
- L2: `prUrl` embedded newlines could corrupt workflow-state.md markdown. Follow-up.
- MEDIUM: `simulate-workflow-walkthrough.js` is 1061 lines (over 800-line cap). Follow-up refactor to extract epic case functions.
- LOW: `main()` in sink-pr.js is 71 lines (over 50). Follow-up.
- LOW: `cmdWatchPr` is 55 lines (slightly over 50). Follow-up.

## Security Review

Ran: yes — touched files include filesystem access, external API calls (gh CLI), execFileSync calls.

### Findings
- H1 (FIXED): Unvalidated `lock.pr_url` passed to `gh pr view` without `--` separator (flag injection). Fixed: added `startsWith('https://')` guard + `'--'` separator in ghExec call.
- M1 (DEFERRED): Same as code review M1 above.
- All other items confirmed as non-issues (JSON injection, OFFLINE guards, isSafeName coverage).

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-reviewer | invoked | .cache/code-reviewer.md | |
| security-reviewer | invoked | .cache/security-reviewer.md | auth, filesystem access, external API calls (gh CLI) |
| review-fix executors | N/A | Trivial Inline Edit Exception applied for H1 | One-line mechanical fix; no behavior/API/security judgment required |
| advisor critical gate | N/A | No CRITICAL findings | |

## Fixes Applied
1. `scripts/kaola-workflow-sink-pr.js:156` — regex `→ /\/pull\/(\d+)/` (HIGH-1 fix)
2. `scripts/simulate-workflow-walkthrough.js:843` — removed trailing slash from gh shim URL (HIGH-1 test fix)
3. `scripts/kaola-workflow-claim.js:409,416` — added `startsWith('https://')` guard and `'--'` separator (security H1 fix)

## Validation Evidence
- `node scripts/simulate-workflow-walkthrough.js` → PASSED (after H1 fix)
- `node scripts/validate-workflow-contracts.js` → PASSED (after H1 fix)

## Follow-Up Items
- M1: branch refspec `+`/`:` rejection (LOW risk, deferred)
- L2: newline stripping on prUrl before markdown write (deferred)
- MEDIUM: extract epic case functions in simulate-workflow-walkthrough.js (line cap violation)
- LOW: extract online path from sink-pr.js main() into helper
- LOW: extract per-lock body from cmdWatchPr into helper

## Review Status
PASSED WITH FOLLOW-UPS
