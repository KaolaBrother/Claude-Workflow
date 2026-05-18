# Phase 2 - Ideation: issue-51

## Approaches Evaluated

### Option A: All 11 ACs in one cycle; sweep-owned GC; fix-then-test
- Summary: Land every AC of issue #51 in a single workflow cycle. Closed-issue cleanup collapsed into `cmdSweep`. Prompt-slim via a new `claim.js print-startup-block --platform=claude|codex` subcommand referenced by `eval` shim in all 14 prompt files. Includes contract validator updates.
- Pros: Single landing; no follow-up issues; one entry-point for closed-issue GC; machine-checkable Claude/Codex divergence.
- Cons: ~600–900 lines across 25+ files; contract-validator + prompt-slim coupling means one regression breaks startup for both runtimes; prompts gain a runtime dependency on `node claim.js print-startup-block`.
- Risk: High
- Complexity: XL

### Option B (RECOMMENDED): Core lifecycle + Codex parity + validation green NOW; defer prompt-slim and roadmap-atomic via follow-up issues
- Summary: Ship the ACs with direct stale-state evidence today (closed-issue cleanup, validation suite green on both simulations, Codex ticker parity, repair/resume ownership, regression coverage, claimExplicitTarget closed guard). File two new GitHub issues (#N1 roadmap atomic, #N2 prompt footprint) at Phase 6 Task B10 with concrete file:line anchors.
- Pros: Reviewable PR (~12 files, ~250 lines); every change maps to a user-observable bug; lease fits; honest scope (deferred ACs become tracked work, not silent drops); Codex parity lands now because H2 fix is the same as 9A3 fix.
- Cons: #51 closes with 2 follow-up issues; user must accept that 11 ACs is too large for one cycle.
- Risk: Medium
- Complexity: M

### Option C: Test-first all 11 ACs; new `lifecycle-gc` subcommand; tooling-light prompt trim
- Summary: TDD-strict ordering — every regression Epic committed RED before fix. Closed-issue cleanup extracted into a new `lifecycle-gc` subcommand. Prompt-slim is verbatim trim (no subcommand).
- Pros: TDD discipline; explicit GC entry point; reversible prompt-slim; all 11 ACs ship.
- Cons: Two cleanup entry points (`sweep` + `lifecycle-gc`) — discoverability tax; ~30% prompt savings vs. ~36% in Option A; RED commits visible in git log; `lifecycle-gc` not auto-invoked, so label leakage still happens unless Phase 6 reliably runs it.
- Risk: Medium
- Complexity: L

## Advisor Findings

The advisor (`.cache/advisor-ideation.md`) confirms Strategy B and surfaces four pre-Phase-3 verifications. All four were completed before this phase file:

1. **Worktrees issue-40/42/46 ARE registered** (`git worktree list --porcelain`). Plan delta: `cmdSweep` first-pass must call `removeWorktree` explicitly (not rely on `git worktree prune` alone). Task B9 (one-shot cleanup) must use `git worktree remove --force` for these registered worktrees.

2. **`kaola-workflow-compact-context.js` is runtime-agnostic** (reads stdin, walks parent dirs for `kaola-workflow/`; no Claude-specific env vars). Plan delta: Task B2 must actually RUN the Codex simulation after the path-fix, not assume green.

3. **`cmdWatchPr` CLOSED → label removal is SAFE**. Existing test 7D (lines 1437–1466) asserts only lock-removed + branch-not-deleted; no label assertion. Plan delta: when flipping `remoteCleanup` at `:2340`, also extend test 7D's gh shim to record `gh issue edit --remove-label` calls and add a new assertion confirming the call was made for CLOSED.

4. **Orphan dirs are terminal-state**. `codex-parity`, `cross-machine-followups`, `minimal-ecc-config` all have `phase6-summary.md` present. Plan delta: second-pass GC at `:2156–2181` should gate on presence of `phase6-summary.md` AND `step: complete` AND no-lock. `issue-32`/`issue-46` have `step: final-validation` (not `complete`) and need explicit manual archive with `--reason=stale-issue-closed-after-final-validation`, not auto-archive.

Also: the **#51 close comment must explicitly list deferred ACs** with links to follow-up issues #N1 and #N2, otherwise the audit reads as silently dropping 5 ACs. Phase 6 Step 7 encodes this.

## Selected Approach

**Strategy B — Core lifecycle + Codex parity + validation green NOW; defer prompt-slim and roadmap-atomic via follow-up issues.**

Rationale: The 11 ACs in #51 are a punch-list, not a contract. Five of them (closed-issue lifecycle, both simulations green, Codex parity, regression coverage, claim-closed guard) have direct stale-state evidence today: the just-cleared issue-46 lock, the registered closed-issue worktrees, the live `step:active` orphan dirs, the 9A3 simulation red, and the broken Codex simulation path. Those land in this cycle. The remaining ACs (roadmap atomic writes, prompt footprint reduction) are real but evidence-thin — they're systemic hygiene without active bleeding. Splitting them into follow-up issues with concrete file:line anchors keeps the #51 PR reviewable (~12 files, ~250 lines), keeps the lease comfortable, and prevents the contract-validator coupling that makes Strategy A's diff brittle.

### Refined Task list (locked for Phase 3 task derivation)

The advisor's four verifications introduced specific plan deltas. Phase 3 must produce task write-sets that incorporate these:

1. **Task B1**: H1 (`isIssueClosed`) helper + H2 (ticker Codex-safe) + 9A3 env-gate. Run `simulate-workflow-walkthrough.js` and confirm 9A3 passes on bare shell.
2. **Task B2**: Fix `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js:113` path. Actually run the Codex simulation and confirm green; escalate if a second failure surfaces.
3. **Task B3**: Add Epic 20A (stale-closed-issue regression) in RED — assertions fail because cleanup not implemented yet.
4. **Task B4**: Implement closed-issue cleanup with worktree removal:
   - `cmdFinalize:1947` → insert `releaseSession(... 'finalized')` before archive
   - `cmdWorktreeFinalize:2761` → `remoteCleanup:false` → `true`
   - `cmdWatchPr:2329–2340` → drop `remoteCleanup:false`; ALSO extend test 7D gh shim + assertion
   - `cmdSweep:2125–2138` first-pass → closed-issue bypass using H1; explicit `removeWorktree(coordRoot, lock.project, lock)` for closed locks (worktree-prune is insufficient for registered worktrees with HEAD commits)
   - `claimExplicitTarget:1304–1327` → closed-issue guard returning `user_target_closed`; add corresponding arm in `cmdStartup` error-message dispatch (Grep `claimResult.status ===` near `:1329+` to find arms)
   - Verify Epic 20A passes GREEN
5. **Task B5**: Add Epic 20B (post-completion auto-claim refusal) in RED; verify against current `cmdPickNext` no-auto-pick block at `:1300–1303`; harden if needed.
6. **Task B6**: Extend `cmdSweep:2156–2181` second-pass GC with the gate `step:complete AND phase6-summary.md exists AND no-lock`.
7. **Task B7**: `repair-state.js:114–118` ownership refusal on empty session; `cmdResume` ownership guard at `:2599`.
8. **Task B8**: Run both simulation suites end-to-end. Both must exit 0.
9. **Task B9**: One-shot cleanup of stale state. For each registered closed-issue worktree (issue-40, issue-42, issue-46): `git worktree remove --force`. For terminal-state orphan dirs (codex-parity, cross-machine-followups, minimal-ecc-config): `archiveProjectDir(root, name, 'closed')` via direct script call or move into `kaola-workflow/archive/`. For `issue-32`, `issue-46`: manual archive with explicit `--reason=stale-issue-closed-after-final-validation`.
10. **Task B10**: File follow-up GitHub issues:
    - **#N1 "Roadmap concurrency: atomic writes for kaola-workflow-roadmap.js"** with line anchors `99–106, 127–135, 182–212`.
    - **#N2 "Prompt footprint: extract Session Heartbeat / Startup Receipt Guard / kaola_script via claim.js print-startup-block"** with line anchors for all 14 prompt files + 2 contract validators.
11. **Task B11**: Update `#51` close comment to explicitly list "Deferred ACs (filed as follow-ups): roadmap concurrency #N1, prompt footprint #N2".

## Out of Scope (explicit)

- Roadmap atomic-write refactor (`scripts/kaola-workflow-roadmap.js:99–106, 127–135, 182–212`) → **follow-up issue #N1**.
- `cmdPrintStartupBlock` subcommand + 14-file prompt refactor + contract validator updates → **follow-up issue #N2**.
- Adding `kaola-workflow-compact-context.js` to `validate-script-sync.js:32–40` allowlist (we use the path-fix at `plugins/.../simulate-kaola-workflow-walkthrough.js:113` instead).
- Doc-updater main-worktree isolation gap (MEMORY-tracked under "Isolation tree gaps"; separate issue track, not part of #51 ACs).
- Phase artifact mirror/archive/finalize/roadmap-refresh/sink-dispatch consolidation (Phase 1 recommendation, not a #51 AC).
- New `lifecycle-gc` subcommand (folded into `cmdSweep` for single entry point; if discoverability becomes a problem after one cycle of evidence, file as follow-up).
- Auto-wiring extra worktree-removal call sites outside `cmdSweep` (`cmdSweep` is the canonical entry).

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
