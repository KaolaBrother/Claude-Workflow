# Phase 2 - Ideation: cross-machine-followups

## Approaches Evaluated

### Option A: Single Task (all 9 items)
- Summary: One tdd-guide invocation handles all 9 items across claim.js, test file, and 12 shims
- Pros: One commit, maximum implementer context
- Cons: Mixes real test-architecture change (MEDIUM-2) with mechanical edits and grep-invariance shims; confuses RED/GREEN ritual; hard to bisect; serial write conflict across all 9 items
- Risk: Medium
- Complexity: Medium
- Architectural fit: Poor

### Option B: Two Tasks (claim.js + test/shim)
- Summary: T1 handles all claim.js edits; T2 handles test file (MEDIUM-2) and 12 shims (LOW-3)
- Pros: Separates file types
- Cons: T2 bundles MEDIUM-2 real test-architecture work with LOW-3 grep-invariance — heterogeneous shapes, hard for a single agent; serial write conflict inside T2
- Risk: Medium-low
- Complexity: Medium
- Architectural fit: Mediocre

### Option C — Three Tasks by Severity (MEDIUM; LOW claim.js; LOW-3 shims)
- Summary: T1 = MEDIUM-2+MEDIUM-4; T2 = LOW claim.js items; T3 = LOW-3 shims
- Pros: Three coherent commits; LOW-3 isolated
- Cons: MEDIUM-4 is one-line mechanical stderr addition — wrong grouping with MEDIUM-2 test-arch work; introduces unnecessary shared write set risk
- Risk: Low
- Architectural fit: Mediocre

### Option C-Refined: Three Tasks by Testability Shape (Selected)
- Summary: Group by whether the item requires a real RED/GREEN test change, not by severity label
- Task T1: MEDIUM-2 only — real test-architecture change (spawnSync→async spawn+poll+liveness)
- Task T2: All 7 claim.js mechanical items (MEDIUM-4, LOW-1, LOW-2, LOW-fd, L1, L2, I1)
- Task T3: 12 markdown shims — grep-invariance batch (LOW-3)
- Pros: Each task has a uniform validation shape; T1 is fully isolated; T2 groups items that share walkthrough invariance; T3 is a pure mechanical batch; each makes a clean commit
- Cons: Three tasks instead of two; T1→T2→T3 must be serial (all share simulate-workflow-walkthrough.js write set)
- Risk: Low
- Complexity: Small per task
- Architectural fit: Strong

## Advisor Findings

Advisor confirmed Option C-Refined is sound. Key Phase 3 blockers identified:

1. **Serial write-set constraint**: T1 modifies simulate-workflow-walkthrough.js in-place (MEDIUM-2 test rewrite); T2 adds SIGINT/SIGHUP test coverage to the same file (LOW-2); T3 adds the LOW-3 grep loop to the same file. Phase 3 must declare T1→T2→T3 serial, not parallel.

2. **LOW-3 canonical form pinned verbatim**: The validator assertion in T3 and all 12 shim edits must use exactly `kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null`. Without verbatim pinning, a different-but-equivalent variant breaks the grep-invariance validator.

3. **MEDIUM-2 test cleanup**: Async spawn requires try/finally that kills the spawned ticker on any assertion-failure path. Orphan tickers under CI will mask future regressions.

4. **MEDIUM-2 polling budget**: 100ms × 30 (3s total) preferred over 50ms × 40.

5. **LOW-2 signal test**: Send signals to the spawned child PID, not the test process PID.

Non-blocking notes: L1 g-flag has no plausible duplicate key collision; I1 Number.isFinite silent skip is a non-regression.

## Selected Approach

**Option C-Refined** — three tasks by testability shape, executed serially.

Rationale: The testability-shape axis is the correct discriminator. MEDIUM-2 is the only item requiring a real test-architecture change (spawnSync→async); isolating it in T1 ensures the RED/GREEN ritual is clean and the other 8 items are not entangled with it. The serial constraint follows directly from the shared write set on simulate-workflow-walkthrough.js.

## Out of Scope (explicit)

- Codex walkthrough 9B2 mirror (separate follow-up)
- Test framework migration
- PID-recycling race redesign (accepted known limitation)
- Lock file schema changes
- Shims outside the 12 listed (kaola-workflow-init, kaola-workflow-next, kaola-workflow-next-pr do not claim sessions)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
