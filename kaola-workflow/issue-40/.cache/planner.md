# Planner Output: Issue #40 — Worktree-Native Workflow Guarantees

## Selected Architecture
Minimum useful consolidation approach:
- Extract `selectFirstClaimable` helper from `runStartupClaimFirstAvailable` — shared by `cmdStartup` and `cmdPickNext`
- No broad rewrite; 14 targeted changes grouped into 5 phases (A→E)

## Implementation Phases

### Phase A — Mechanical safety net (unblocks CI immediately)
1. **Byte-sync plugin validator** (Flaw 1): `cp scripts/validate-workflow-contracts.js plugins/kaola-workflow/scripts/validate-workflow-contracts.js`
2. **Fix `cmdWorktreeFinalize` root derivation** (Flaw 6): Replace `const root = getRoot()` with `const root = findMainWorktree() || getRoot()` at line 2402
3. **Add Case 17M** (finalize from inside worktree): assert `verdict: 'finalized'` and no `.kw.kw/` path corruption

### Phase B — Consolidation (the architectural anchor)
4. **Extract `selectFirstClaimable` helper** from `runStartupClaimFirstAvailable` (line ~1190): loop body with `claimer` callback abstracting the side-effect difference
5. **Refactor `runStartupClaimFirstAvailable`** to call `selectFirstClaimable` with legacy `runBootstrapClaim` as the claimer
6. **Rewrite `cmdPickNext`** (Flaws 4+5+8+9 atomically):
   - Use `fetchOpenIssueRecords` + `sortIssueRecords` + `readPriorityConfig` (Flaw 5)
   - Call `selectFirstClaimable` with worktree-provisioning claimer (Flaw 5)
   - After success: call `writeStartupReceipt` with `claim: 'acquired'` (Flaw 4)
   - After receipt: write `workflow-state.md` to main worktree with `expires: now+24h` (Flaws 8+9)
   - Call `runBootstrapSweep` at top (prevents orphan accumulation)
7. **Add Case 17L**: `verify-startup` after pick-next → assert `authorized: true` + state file exists
8. **Add Case 17N**: sweep GCs expired pick-next worktree via `expires`
9. **Add pick-next/finalize/receipt assertions to Codex validator** (`validate-kaola-workflow-contracts.js`): Flaw 11

### Phase C — Router routing (depends on Phase B receipt)
10. **Replace `exit 0` with verdict-based routing** in `commands/workflow-next.md:63` (Flaw 2): capture `PICK_NEXT_OUT`, parse verdict, route `acquired` to phase 1 like `owned` routes from startup
11. **Mirror router change into Codex SKILL.md** (Flaw 3): add `KAOLA_WORKTREE_NATIVE` branch matching Claude router

### Phase D — Resume reads state file (depends on Phase B state file)
12. **Teach `scanPhaseArtifacts`** to read `workflow-state.md` first (Flaw 7): parse `next_command` + `step`; fall back to artifact scan if absent/invalid

### Phase E — Termination sequence
13. **Add cleanup to `cmdWorktreeFinalize`** (Flaw 10): after commit, call `archiveProjectDir` + `releaseSession` + `removeWorktree`; emit `removal: "deferred"|"removed"`
14. **Extend Case 17F**: assert archive exists; assert worktree removed or deferred

## Key Design Decisions
- `selectFirstClaimable` accepts a `claimer` callback — abstracts lock (legacy) vs worktree (native) side-effect
- `pick-next` uses `expires: now+24h` so sweep GC fires correctly
- Router uses `node -e 'JSON.parse(...)'` for JSON parsing (not grep/sed)
- `removeWorktree` (line 639) defers to `.pending-removal` if cwd is inside the worktree; emit `removal: "deferred"` explicitly

## Items NOT to Build
- New "claim engine" module or file
- Sync of the two simulate files (intentionally different)
- Rewrites of `cmdStartup` or `runBootstrapClaim`
- `KAOLA_WORKTREE_NATIVE` handling inside `cmdPickNext` (it IS the native path)
- Expansion of `selectFirstClaimable` beyond two callers
- `watch-pr` or roadmap sync in pick-next
- Lock format migration for sweep

## Risks
- **Highest**: `cmdPickNext` rewrite (Step 6) — guard with Cases 17L+17N
- **Medium**: Router JSON parsing (Step 10) — use `node -e` not grep/sed
- **Medium**: `removeWorktree` deferral (Step 13) — test accepts either outcome
- **Low**: Line number drift — use `assertIncludes` (substring) not line-anchored checks

## Recommended Execution Order
A → B+F (single commit) → C → D → E

## Success Criteria
- [ ] `npm test` exits 0
- [ ] Plugin and root `validate-workflow-contracts.js` byte-identical
- [ ] `verify-startup` succeeds after `pick-next`
- [ ] `workflow-state.md` with `expires` written to main worktree by pick-next
- [ ] `pick-next` uses same issue-selection semantics as startup
- [ ] `worktree-finalize` correct from inside worktree; archives + releases + removes
- [ ] Router routes after pick-next (no `exit 0`)
- [ ] `scanPhaseArtifacts` reads state file first
- [ ] Sweep GCs orphaned pick-next worktrees
- [ ] Cases 17L, 17M, 17N present and passing; 17F asserts cleanup
- [ ] Codex validator asserts new contracts
