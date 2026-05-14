# Advisor: claim-hardening Plan Gate

## Overall Verdict
Blueprint ready for Phase 4. All verification items closed. One concrete test addition required.

## Verification Confirmations

- INFO stub return shape `{ session: null, lock, remote: {assignee:null, has_label:null, sentinel_comment_id:null}, consistent: false, drift: ['session_id unsafe'] }` matches actual `.map()` callback at claim.js:354.
- `--json` handled by parseArgs (line 51); `cmdStatus` always emits JSON; test invocation is valid.
- `cmdHeartbeat` preconditions (match found, isSafeName asserts, stateFile path) are satisfiable with the 8B setup; `updateLeaseInPlace` is reached.
- `releaseSession` only deletes `.lock` and `.json` session file; `workflow-state.md` retains Sink+Lease; 8E's claim #4 correctly hits the regex replace path.

## Required Change

**8B missing exit-code assertion.** `spawnSync` captures stderr, but the blueprint doesn't assert `r.status === 0`. Heartbeat with missing `## Lease` should warn but not fail — the new warning code path keeps `return` (not `throw`), exit code stays 0. Add:
```
assert(r.status === 0, '8B: heartbeat exits 0 even when Lease missing');
```
next to the stderr assertion. Catches a future regression where the warning gets "upgraded" to an error.

## Non-Blocking Observations

1. **8E' (Sink-without-Lease) stays optional.** `updateSinkLease` always writes Sink+Lease atomically; the `$` alternative in `(?=\n## [^SL]|\n## L|$)` is unreachable in current production. Note in the plan that 8E' would test dead code under the current write contract. If a future change makes Sink-without-Lease reachable, 8E' becomes mandatory.

2. **8C regression-only is acceptable; strengthening is overkill.** No natural injection point for non-digit `claim_comment_id` — `postGitHubClaim` returns null (offline) or regex-extracted digits (live). The architect's documentation comment above the assertion is sufficient.

3. **Bottom-up edit order is not load-bearing.** Anchor-based Edit-tool calls don't depend on order. Convention is fine.

## Net
Plan is ready for Phase 4 after adding the `r.status === 0` assertion to 8B.
