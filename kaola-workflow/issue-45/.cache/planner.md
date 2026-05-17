# Planner: issue-45

## Approach Selected: B — Risk-stratified phases

### Option A (Rejected): One-shot all 7 fixes in a single commit
- Risk: High — large review surface, hard to bisect

### Option B (Recommended): Three-phase risk-stratified commits
- Phase 1: Low-risk additive fixes (Flaws 1a/1b/4, Gap A)
- Phase 2: New parsers and scan passes (Flaw 2, Gaps B/C)
- Phase 3: Critical claim path + SKILL.md (Flaw 3, KAOLA_WORKTREE_PATH)
- Risk: Medium — each phase independently verifiable

### Option C (Rejected): TDD per fix (7 separate cycles)
- Risk: Low but wasteful — excessive sync operations

## Implementation Steps

### Phase 1 — Additive Low-Risk Fixes

1. Reorder sink-field capture in finalize SKILL.md BEFORE cmdFinalize call
2. Add `state` to gh fetch in cmdStatus; push 'issue closed' to drift when closed
3. Add `closed: issue_data?.state === 'CLOSED'` flag in cmdWorktreeStatus entry
4. `try { fs.rmdirSync(path.dirname(wtPath)); } catch (_) {}` after git worktree remove
5. Sync plugin mirror + run tests

### Phase 2 — New Parsers and Scan Passes

6. Parse phase4-progress.md rows in scanPhaseArtifacts: check `| pending |` / `| in_progress |` before advancing to phase5
7. Third sweep pass for .abandoned-* entries older than GC_CUTOFF_MS in *.kw/ parent
8. Second pass in cmdWorktreeStatus scanning *.kw/ parent for unregistered dirs with `registered: false`
9. Sync plugin mirror + run tests

### Phase 3 — Critical Claim Path

10. Add `worktree_path` to startup receipt in `owned` branch
11. Add `worktree_path` to startup receipt in `acquired` branch
12. Add `worktree_path` to cmdPickNext persisted receipt (was already on stdout)
13. Preserve target_mismatch NO-WRITE invariant (add comment, no code change)
14. Extract `KAOLA_WORKTREE_PATH` in kaola-workflow-next/SKILL.md
15. Sync plugin mirror + run tests

### Phase 4 — Regression Tests (merge with Phase 3 or separate commit)

10 new test cases 17P–17V:
- 17P: cmdStatus CLOSED issue → drift has 'issue closed', consistent: false
- 17Q: cmdWorktreeStatus CLOSED issue → entry has closed: true
- 17R+: scanPhaseArtifacts with pending phase4 rows → routes to phase4
- 17R-: scanPhaseArtifacts with all-complete phase4 rows → routes to phase5
- 17S: startup owned receipt includes non-null worktree_path
- 17S': target_mismatch receipt unchanged after second startup call (NO-WRITE invariant)
- 17T+: removeWorktree last sibling → parent *.kw/ removed
- 17T-: removeWorktree with sibling → parent *.kw/ retained
- 17U: cmdSweep removes .abandoned-old (>30min) but not .abandoned-fresh
- 17V: cmdWorktreeStatus second pass surfaces unregistered dir with registered: false

## Key Risks
- Steps 10/11 must not touch target_mismatch path (issue-44 invariant)
- Step 7 recursive rm: restrict to *.kw/ parent, require .abandoned- prefix
- Step 8: new `registered` field must be additive (not break existing 17C assertions)
- Step 6: use literal pipe-padded token match for task row parsing

## Out of Scope
- No new JS modules
- No new external dependencies
- No changes to cmdStartup target_mismatch branch
- No changes to GC_CUTOFF_MS constant
- No edits to Codex-only scripts or plugin runtime cache
