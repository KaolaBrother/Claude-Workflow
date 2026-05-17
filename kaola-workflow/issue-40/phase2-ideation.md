# Phase 2 - Ideation: issue-40

## Approaches Evaluated

### Option A: Minimum Useful Consolidation (Selected)
- **Summary**: Extract `selectFirstClaimable` helper from `runStartupClaimFirstAvailable`. Rewrite `cmdPickNext` to use it. Fix 14 targeted flaws in 5 execution phases (A→E). No broad rewrite of claim.js.
- **Pros**: Directly addresses all 11 flaws; minimal blast radius; each phase is independently testable; does not require understanding the full claim.js surface
- **Cons**: Step 6 (`cmdPickNext` rewrite) is complex; requires careful ordering (B before C/D)
- **Risk**: Medium — `cmdPickNext` rewrite touches concurrent code paths; mitigated by Cases 17L+17N
- **Complexity**: Medium (14 targeted changes, not a rewrite)

### Option B: Full Claim Engine Rewrite
- **Summary**: Extract a `ClaimEngine` module from `kaola-workflow-claim.js`, migrate all subcommands to use it, sync plugin copy
- **Pros**: Cleaner long-term architecture; eliminates the duplication root cause
- **Cons**: Disproportionate scope for 11 flaws; high regression risk; blocks CI while in progress; contradicts issue's explicit "minimum useful consolidation" constraint
- **Risk**: High
- **Complexity**: XL

### Option C: Sync-Only Fix (Rejected)
- **Summary**: Just `cp scripts/validate-workflow-contracts.js plugins/kaola-workflow/scripts/validate-workflow-contracts.js`; no runtime changes
- **Pros**: Unblocks CI immediately; zero regression risk
- **Cons**: Leaves all 11 runtime flaws unaddressed; `verify-startup` still exits 2 after pick-next; router still has `exit 0`; resume detection still artifact-only
- **Risk**: Low (but high risk of leaving the system broken)
- **Complexity**: Trivial

## Advisor Findings

Advisor reviewed planner output. Full response: `.cache/advisor-ideation.md`.

**Summary**:
- Option A is sound; execution order A→B→C→D→E is dependency-correct
- No missed approaches identified
- 3 pre-Phase-B implementation requirements added:
  1. `runBootstrapSweep` is safe in `cmdPickNext` — OFFLINE-gated; pick-next is startup-equivalent (within performance budget)
  2. `ownedActiveProject` short-circuit must be an explicit early-return block in `cmdPickNext`, not a parenthetical note
  3. `workflow-state.md` written by `cmdPickNext` must use `phase: 1, step: claimed` to match `cmdStartup`'s schema exactly
- Non-blocking: make `archiveProjectDir` idempotent in Phase E (prevents double-archive when Phase 6 skill follows `worktree-finalize`)

## Selected Approach

**Option A: Minimum Useful Consolidation**

Rationale: The issue explicitly constrains "minimum useful consolidation". All 11 flaws have targeted fixes at the right level of abstraction. The `selectFirstClaimable` helper is the correct extraction boundary — small enough to be focused, large enough to eliminate the dangerous duplication between `cmdStartup` and `cmdPickNext` selector logic. Option B is disproportionate; Option C is insufficient.

Execution order: A → B (with F = test cases) → C → D → E

## Out of Scope (explicit)

From planner `.cache/planner.md`:
- New "claim engine" module or file
- Sync of the two simulate files (intentionally different)
- Rewrites of `cmdStartup` or `runBootstrapClaim`
- `KAOLA_WORKTREE_NATIVE` handling inside `cmdPickNext` (it IS the native path)
- Expansion of `selectFirstClaimable` beyond two callers
- `watch-pr` or roadmap sync in pick-next
- Lock format migration for sweep

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
