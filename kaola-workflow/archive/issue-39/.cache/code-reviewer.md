# Code Review Cache — issue-39

## Verdict: APPROVE with MEDIUM follow-up

## Findings Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 2 |

## MEDIUM

### MEDIUM-1: Area broadening — potential false-positive red verdicts

**File:** `scripts/kaola-workflow-classifier.js`, `extractCoarseAreas` (~lines 154-167)

Removing `COARSE_AREAS` filtering means any first path-segment (`src`, `lib`, `api`, etc.) becomes a coarse area and can trigger `hasDirectOverlap`. Two issues touching _different_ files under the same top-level directory (e.g., `src/auth.ts` vs `src/profile.ts`) now produce `directOverlap = true` → `red`, where the old code produced `green`.

This is overly broad area-level collision. The exact-file-path detection (the core Bug 1 fix intent) is correct. The area-level false positives are a side effect.

**Note:** Known design tradeoff of Option 1A, explicitly acknowledged in Phase 2. Not an implementation error. Classify as follow-up.

## LOW

### LOW-1: AREA_PATH_REGEX natural-language noise

The new `AREA_PATH_REGEX` matches bare `word/[space]` tokens in prose (e.g., `"fix/ enhancement"` → area `'fix'`). Previously blocked by COARSE_AREAS. Low practical risk in normal usage.

### LOW-2: Case 6J poll budget (1500ms)

The 15-iteration sync poll loop could be flaky on loaded CI. The `nohup` process may not have fully exited before `rmSync(epic6JTmp, {force: true})`, but this is silently absorbed. Non-blocking.

## Detailed Notes

**Bug 2 fix (existsSync guard):** Correct. Guard is after `isSafeName` and before any `readFileSync`. `anyClaimedAtPhaseLeTwo` set only after guard — correct ordering.

**Bug 1 fix (regex generalization):** Exact-path detection is correct (Case 6H tests and passes). `SHARED_INFRA` remains intact. Area broadening is a known tradeoff.

**Bug 3 fix (orphan-exit guard):** Correct. `acquirePidFile` runs before the check, so unlink correctly cleans up the PID file. `return` vs `process.exit(0)` — correct, exits with code 0. Stderr message matches test assertion.

**Plugin mirrors:** Byte-identical for classifier and claim. Test file is semantic mirror (different case numbering: 5e2-h/5e2-i vs 6H/6I — cosmetic only, not a parity gap).
