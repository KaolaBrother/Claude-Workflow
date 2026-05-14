# Advisor Closure Gate: claim-hardening

## Deferred Items Scanned

From phase5-review.md follow-up items:
- M-2: simulate-workflow-walkthrough.js exceeds 800/1150 line limits
- updateSinkLease function-form replace parity for $&/$1 expansion (security LOW)
- M-3: Test 8D assertion tightening
- L-1: Test 8E label correction
- L-2: runClaim helper stderr surfacing
- L-3: Test 8B path style minor inconsistency

## Advisor Recommendation

Close #10. All 5 original checklist items (M1, M2, S-L1, S-L2, INFO) ship with
verified GREEN evidence. H1 was a scope expansion from the security review — also
resolved. The follow-up items are real but none is blocking: they are test hygiene
(M-3, L-1, L-2, L-3), a security parity gap that requires controlling
isSafeName-validated fields to exploit (LOW parity), and a test-file line-count
violation that would require an out-of-scope harness refactor to fix cleanly.

Open a single follow-up issue titled:
"claim-hardening follow-ups: updateSinkLease replace parity + test hygiene"

Containing:
- updateSinkLease: convert string-form .replace() to function-form callbacks (phase5
  security LOW — $&/$1 expansion parity with cmdPatchBranch line 387)
- Test 8D: tighten assertion so entry8d == null fails loudly rather than passing
- Test 8E: correct label from "re-claim Sink refresh" to "claim-after-release"
- L-2: surface stderr in runClaim helper on failure

Do NOT bundle the test-file decomposition (M-2) into this follow-up — that is a
separate refactor with its own scope.

## Issue Organization Decision

- Close #10 after commit+push with validation evidence comment
- Create one follow-up issue for the items above
- Do NOT create a separate issue for test-file decomposition at this time;
  defer to roadmap triage

## Date
2026-05-15T03:50:00Z
