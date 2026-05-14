# Security Review: pr-sink

## CRITICAL
None.

## HIGH
H1 (FIXED): Unvalidated `lock.pr_url` passed as positional arg to `gh pr view` without `--` separator — flag injection risk. Fixed in cmdWatchPr: added `lock.pr_url.startsWith('https://')` guard and `'--'` before the URL in ghExec call.

## MEDIUM
M1 (DEFERRED): `args.branch` refspec characters `+` and `:` not rejected before `git push`. Low exploitability at call site (branch value comes from lock file, not direct user input at runtime). Follow-up item.

## LOW
L1: `lock.branch` in `git branch -D` — mitigated by `--` separator, no action needed.
L2: `prUrl` could contain embedded newlines → markdown corruption. Follow-up.

## Non-issues Confirmed
- JSON injection via Object.assign + JSON.stringify: not applicable.
- OFFLINE guard completeness: both scripts short-circuit correctly.
- `args.project` path traversal: isSafeName applied consistently.
- patchLockFile / updateStateSinkBlock path construction: validated.

## Fixes Applied
- H1: cmdWatchPr now has `!lock.pr_url.startsWith('https://')` guard and `'--'` separator in ghExec call.

## Validation After Fix
node scripts/simulate-workflow-walkthrough.js → PASSED
node scripts/validate-workflow-contracts.js → PASSED
