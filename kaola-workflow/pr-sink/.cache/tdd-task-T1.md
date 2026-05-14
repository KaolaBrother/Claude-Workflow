# TDD Task T1: kaola-workflow-claim.js

## Result: COMPLETE

## Functions Changed/Added

| Change | Function | Lines | Type |
|--------|----------|-------|------|
| T1.1 | parseArgs | 48-59 | Modified — added --sink flag parser |
| T1.2 | cmdClaim | 182-236 | Modified — added --sink enum assertion; added sink, pr_url, pr_number to lockData |
| T1.3 | buildSinkBlock | 97-111 | Added — new helper building ## Sink block content |
| T1.3 | updateSinkLease | 113-138 | Rewritten — uses buildSinkBlock, replaces entire Sink block |
| T1.4 | releaseSession | 238-259 | Added — extracted release logic as reusable helper |
| T1.4 | cmdRelease | 261-265 | Rewritten — thin wrapper calling releaseSession(getRoot(), args.session) |
| T1.5 | cmdWatchPr | 395-449 | Added — watch-pr subcommand |
| T1.6 | main | 451-462 | Modified — usage string + watch-pr dispatcher |

## RED Evidence

- T1.1 RED: --sink invalid exits 0 (no validation existed)
- T1.2 RED: lock has sink field = false
- T1.4 RED: releaseSession in source = false
- T1.5 RED: watch-pr exits 1 "unknown subcommand"

## GREEN Evidence

- T1.1 GREEN: --sink pr exits 0; --sink merge exits 0; --sink foo exits 1
- T1.2 GREEN: lock.sink = pr when --sink pr; lock.sink = merge when omitted
- T1.3 GREEN: workflow-state.md includes sink: pr in ## Sink block
- T1.4 GREEN: releaseSession in source = true; lock removed after release
- T1.5 GREEN: watch-pr exits 0 cleanly under OFFLINE=1
- T1.6 GREEN: watch-pr no "unknown" stderr

## Validation

node scripts/validate-workflow-contracts.js → PASSED
node scripts/kaola-workflow-claim.js → usage string includes watch-pr
node scripts/simulate-workflow-walkthrough.js → PASSED

## Deviations

None — only scripts/kaola-workflow-claim.js modified.
