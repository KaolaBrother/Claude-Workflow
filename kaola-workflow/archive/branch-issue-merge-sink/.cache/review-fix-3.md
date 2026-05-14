# Review Fix 3 — H1 regex fix iteration 2 + H2 main() final trim

## Status: COMPLETE

## Files Modified
- `scripts/kaola-workflow-claim.js`
- `scripts/kaola-workflow-sink-merge.js`

## Fix A — H1: Lease regex (claim.js line 126)
Old: `/^## Lease[\s\S]*?(?=\n##|\s*$)/` (without m flag, never matches because ^ requires position 0)
New: `/(?:^|\n)(## Lease[\s\S]*?)(?=\n##|[\s]*$)/` with replacement `'\n' + leaseBlock.slice(1)`
Inline test confirmed: Sink block preserved, old session replaced, branch field updated.

## Fix B — H2: main() trimmed (sink-merge.js)
Extracted Steps 7-9 into postMergeCleanup(args) (17 lines).
Final line counts: main()=39, doRebase()=25, ffMergeLoop()=45, postMergeCleanup()=17. All under 50.

## Validation
Workflow walkthrough simulation passed
Workflow contract validation passed
All 4 Epic Cases pass.
