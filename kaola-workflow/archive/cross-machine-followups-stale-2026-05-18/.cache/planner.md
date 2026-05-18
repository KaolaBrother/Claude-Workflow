# Planner: cross-machine-followups (issue #12)

## Summary

9 deferred tech-debt items. The discriminator for grouping is testability shape, not severity label.

## Per-Item Testability Audit

| Item | File | TDD Shape |
|------|------|-----------|
| MEDIUM-2 | simulate-walkthrough.js:1608 | Real RED — test-arch change required (spawnSync → async spawn + poll + liveness assert) |
| MEDIUM-4 | claim.js:231 | Weak RED / walkthrough invariance — one-line stderr addition |
| LOW-1 | claim.js:467 | Refactor by inspection — tautology removal, no behavioral discriminator |
| LOW-2 | claim.js:523+ | RED feasible — spawn ticker, send SIGINT/SIGHUP, assert PID file removed |
| LOW-3 | 12 markdown shims | Grep-invariance — files not independently executable |
| LOW-fd | claim.js:459 | Refactor by inspection — return true vs closed fd, observationally identical |
| L1 | claim.js:183-184 | Synthetic RED — requires duplicate keys in artificial state file |
| L2 | claim.js:228 | Defensive only — no realistic failing input given workflow/ prefix |
| I1 | claim.js:494 | Synthetic RED — requires hand-crafted lock with non-finite issue_number |

## Option A — Single Task (all 9)
- Pros: one commit, maximum implementer context
- Cons: mixes test-arch change with mechanical edits; confuses RED/GREEN ritual; hard to bisect
- Risk: Medium
- Architectural fit: Poor

## Option B — Two Tasks (claim.js + test/shim)
- Pros: separates file types
- Cons: second task bundles MEDIUM-2 test-arch work with LOW-3 grep-invariance — heterogeneous
- Risk: Medium-low
- Architectural fit: Mediocre

## Option C — Three Tasks by Severity (MEDIUM; LOW claim.js; LOW-3 shims)
- Pros: three coherent commits; LOW-3 isolated
- Cons: MEDIUM-4 is mechanical (one-line), wrong grouping with MEDIUM-2 test-arch work
- Risk: Low

## Recommended: Option C-Refined (3 tasks by testability shape)

| Task | Items | Validation |
|------|-------|------------|
| T1: MEDIUM-2 test-arch | MEDIUM-2 only | Async spawn + PID poll + process.kill(newPid, 0) liveness assert |
| T2: claim.js mechanical | MEDIUM-4, LOW-1, LOW-2, LOW-fd, L1, L2, I1 | Walkthrough invariance + small LOW-2 SIGINT/SIGHUP test |
| T3: LOW-3 shim batch | 12 markdown files | Grep-invariance added to walkthrough: assert each file contains `kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)"` |

## MEDIUM-2 Correct RED Test Shape
Current `spawnSync(timeout: 3000)` blocks until child exits — liveness assertion on a corpse is impossible.
Fix: async `spawn`, poll PID file (50ms × 40) until content ≠ '99999999', then assert `process.kill(newPid, 0)`, then SIGTERM, assert exit 0 + PID file removed.

## LOW-3 Validation Strategy
Grep-invariance (recommended over bash snippet extraction). Add test block that iterates 12 file paths, asserts each contains the new `kill -0` clause.

## Items NOT independently testable
LOW-1, LOW-fd, L1, L2 — validated by walkthrough invariance + code review inspection.

## Out-of-Scope
- Codex walkthrough 9B2 mirror (separate follow-up)
- Test framework migration
- PID-recycling race redesign (accepted)
- Lock file schema changes
- Shims outside the 12 listed (init, next, next-pr don't claim sessions)
