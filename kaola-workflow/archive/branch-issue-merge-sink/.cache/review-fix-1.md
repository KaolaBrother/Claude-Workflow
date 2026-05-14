# Review Fix 1 — JS HIGH findings (claim.js + sink-merge.js)

## Status: COMPLETE

## Files Modified
- `scripts/kaola-workflow-claim.js`
- `scripts/kaola-workflow-sink-merge.js`

## Fixes Applied
1. Code H1: Removed `m` flag from Lease block regex in updateSinkLease
2. Code M1/Security M1: Function form replacements for branch: line (lines 125, 367)
3. Security H1: Leading-dash validation in sink-merge.js + `--` separators on git merge/branch -d/push --delete
4. Security LOW: Numeric validation of claim_comment_id before gh invocation
5. Code H2: Refactored main() — extracted doRebase() (25 lines) + ffMergeLoop() (45 lines); main() ~55 lines

## Deviation
git checkout calls did NOT get `--` separator (breaks branch checkout semantics); leading-dash validation provides equivalent protection.

## Validation
```
Workflow walkthrough simulation passed
Workflow contract validation passed
```
All 4 Epic Cases pass.
