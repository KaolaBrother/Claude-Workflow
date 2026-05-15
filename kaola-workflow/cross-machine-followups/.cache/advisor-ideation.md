# Advisor — Ideation Gate: cross-machine-followups

## Verdict
Option C-Refined is sound. The testability-shape axis is the right discriminator and the MEDIUM-2 spawnSync→async insight is load-bearing. Proceed.

## Blocks Phase 3 Planning (must address in blueprint)

1. **Serial write-set on simulate-workflow-walkthrough.js.** T1 modifies 9B2 in-place; T2 adds SIGINT/SIGHUP coverage; T3 adds the LOW-3 grep loop. All three tasks share this test file. Phase 3 must declare them serial (T1→T2→T3), not parallel. Parallel grouping will cause merge conflicts.

2. **LOW-3 canonical form must be pinned verbatim in Phase 3.** The validator assertion and all 12 shim files must use exactly the same form. Recommended pin: `kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null`. Without this, a different-but-equivalent variant from tdd-guide breaks the validator.

## Phase 4 Implementation Discipline (call out in task notes)

3. **MEDIUM-2 test cleanup.** Async spawn requires try/finally that kills the spawned ticker on any assertion-failure path. Orphan tickers under CI will mask future regressions.

4. **MEDIUM-2 polling budget.** 100ms × 30 (3s) preferred over 50ms × 40 (2s) — tighter under CI load.

## Non-Blocking Notes

5. **L1 (g flag)**: no plausible duplicate key collision in current workflow-state.md format — acceptable defense-in-depth.

6. **I1 silent skip**: `Number.isFinite` failing silently skips tiebreaker (same as current truthy check) — non-regression, fine to keep silent.

7. **LOW-2 signal test**: send signals to the spawned child PID, not the test process. Worth explicit mention in task spec.

## User Decision Required
None. No ambiguity blocks a correct technical decision.
