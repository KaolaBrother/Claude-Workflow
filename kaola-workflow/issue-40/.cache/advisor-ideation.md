# Advisor Gate: Issue #40 — Worktree-Native Workflow Contract

## Review of Planner Output

The planner selected the "minimum useful consolidation" approach: extract `selectFirstClaimable` helper from `runStartupClaimFirstAvailable` and wire `cmdPickNext` to use it. 14 targeted changes in 5 execution phases (A→E). No broad rewrite.

## Missed Approaches
None identified. The planner correctly identified that:
- A broad claim-engine rewrite would be disproportionate to the scope
- `selectFirstClaimable` is the right extraction boundary (single helper, two callers)
- Sync-only (just cp validate-workflow-contracts.js) is insufficient — it unblocks CI but leaves the runtime flaws unaddressed

## Risk Assessment
Risks are accurately characterized. The planner's highest-risk identification of `cmdPickNext` rewrite (Step 6) is correct — it touches the most concurrent code paths.

## Recommendation Assessment
Sound. Execution order A→B→C→D→E is dependency-correct:
- A (mechanical safety net) unblocks CI and is independent
- B (cmdPickNext rewrite) is the architectural anchor; C, D depend on it
- C (router routing) depends on B's receipt; D (resume) depends on B's state file
- E (finalize cleanup) is terminal and independent of C/D

## Pre-Phase-B Verification Results

### Check 1: `runBootstrapSweep` network behavior (RESOLVED)
**Question**: Is `runBootstrapSweep` purely local-file work?
**Finding**: NO — `cmdSweep` (called by `runBootstrapSweep`) calls `ghExec(['issue', 'edit', ...])` for stale lock cleanup, but ONLY when `!OFFLINE && lock.issue_number != null` (lines 1936-1944). The `OFFLINE` guard is already present.
**Decision**: Safe to include in `cmdPickNext`. `pick-next` is the startup-equivalent path, so sweep-level network work is within the performance budget ("network only during startup/sync/sweep"). The `OFFLINE` flag already suppresses network when needed.

### Check 2: `ownedActiveProject` short-circuit in cmdPickNext Step 6 (MUST IMPLEMENT EXPLICITLY)
**Requirement**: Before calling `selectFirstClaimable`, `cmdPickNext` must check `ownedActiveProject(coordRoot, root, args.session)` and return an `owned` verdict immediately if the session already holds a project. This prevents double-claim when two sessions race.
**Implementation note**: The planner's Step 6 mentions this parenthetically in the claimer callback. It must be an explicit early-return block at the top of `cmdPickNext`, mirroring the check in `cmdStartup`/`cmdBootstrap` at line ~1170.

### Check 3: `workflow-state.md` schema from cmdPickNext (MUST MATCH cmdStartup)
**Requirement**: The `workflow-state.md` written by `cmdPickNext` must use `phase: 1, step: claimed` (not `phase: 0`) to match `cmdStartup`'s existing writer at line 1439.
**Rationale**: `scanPhaseArtifacts` (once fixed by Step 12) will read `next_command` from this file. Using a non-standard schema breaks resume detection for any session that resumes after pick-next.
**Implementation note**: Use the same writer function (`writeClaim`/inline write at line 1439) or replicate its field set exactly: `phase`, `phase_name`, `step`, `next_command`, `main_session_role`, `implementation_owner`, `fix_owner`, `inline_emergency_fallback_authorized`, `## Sink`, `## Lease` blocks.

## Non-Blocking Follow-Ups

### archiveProjectDir idempotency (Phase E, non-blocking)
When Phase 6 skill runs after `cmdWorktreeFinalize`, `archiveProjectDir` may be called twice (once in `cmdWorktreeFinalize` Step E-13, once in Phase 6 Step 8b). The function should be made idempotent (check if archive already exists before rename). Record this as a follow-up in Phase E implementation notes — does not block A→D.

## Verdict
APPROVED with 3 pre-Phase-B implementation requirements. Execution order and approach confirmed.
