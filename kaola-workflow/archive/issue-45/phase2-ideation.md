# Phase 2 - Ideation: issue-45

## Approaches Evaluated

### Option A: One-shot all 7 fixes in a single commit
- Summary: Apply all flaws and gaps in one pass
- Pros: Fastest to deliver; no coordination overhead
- Cons: Large review surface; hard to bisect if one fix regresses another; test failures harder to attribute
- Risk: High
- Complexity: Large

### Option B: Three-phase risk-stratified commits (Selected)
- Summary: Group fixes by blast radius and test dependency
  - Phase 1: Low-risk additive fixes (Flaws 1a/1b, Flaw 4, Gap A)
  - Phase 2: New parsers and scan passes (Flaw 2, Gaps B/C)
  - Phase 3: Critical claim path + SKILL.md (Flaw 3, KAOLA_WORKTREE_PATH)
- Pros: Each phase independently verifiable; regression attribution is scoped; review surface manageable
- Cons: Three commits instead of one; requires careful ordering
- Risk: Medium
- Complexity: Medium

### Option C: TDD per fix (7 separate cycles)
- Summary: Write a failing test, implement fix, verify green, repeat for each of the 7 issues
- Pros: Lowest defect risk; maximum traceability
- Cons: 7 sync cycles; excessive overhead for fixes that have clear deterministic behavior
- Risk: Low but wasteful
- Complexity: XL

## Advisor Findings

Advisor confirmed Option B is correct. Five refinements incorporated:

1. **KAOLA_WORKTREE_PATH scope verified**: `commands/workflow-next.md` does NOT reference
   `KAOLA_WORKTREE_PATH`. Scope stays Codex `kaola-workflow-next/SKILL.md` only.

2. **Gap B GC: parse suffix timestamp, not mtime**: `.abandoned-<ISO>` suffix encodes the
   abandonment time. Parse the suffix directly; fall back to `fs.statSync().mtimeMs` only if
   suffix parse fails. Test 17U uses a named dir with old ISO timestamp, not real elapsed time.

3. **Gap C: use `fs.realpathSync` for dedup**: compare canonical paths when checking whether
   a scanned dir is already in the registered `entries` list.

4. **Flaw 2: match both `in_progress` and `in-progress`**: use regex
   `/\|\s*(pending|in[_-]progress)\s*\|/i` to handle legacy row format.

5. **Phase 3 `worktree_path` source**: read from `coordRoot/locks/{project}.lock.json`, not
   `workflow-state.md`. Verify field name before implementation.

## Selected Approach

**Option B — Risk-stratified three-phase commits.**

Rationale: The 7 fixes span radically different blast radii. Grouping by risk tier (additive
→ new parsers → critical claim path) makes each commit independently verifiable and bisectable.
The advisor confirmed this structure and added 5 refinements that sharpen the implementation
and test strategy without changing the phase structure.

## Implementation Plan (refined from planner)

### Phase 1 commits — Additive Low-Risk
1. `cmdStatus`: add `state` to `--json` fields; push `'issue closed'` to `drift` when closed
2. `cmdWorktreeStatus`: add `closed: issue_data?.state === 'CLOSED'` flag in entry
3. `finalize/SKILL.md`: capture `SINK_KIND`/`SINK_BRANCH` BEFORE `cmdFinalize` call
4. `removeWorktree`: add `try { fs.rmdirSync(path.dirname(wtPath)); } catch (_) {}` after git worktree remove

### Phase 2 commits — New Parsers and Scan Passes
5. `scanPhaseArtifacts` path 2: parse `phase4-progress.md` rows — match
   `/\|\s*(pending|in[_-]progress)\s*\|/i`; only advance to phase5 when all rows complete
6. `cmdSweep` third pass: scan `*.kw/` parent for `.abandoned-*` dirs; parse suffix ISO timestamp;
   remove if age > GC_CUTOFF_MS; fall back to mtime if suffix parse fails
7. `cmdWorktreeStatus` second pass: scan `*.kw/` parent for `issue-\d+` and `.abandoned-*` subdirs
   not in entries (compare via `fs.realpathSync`); append with `registered: false`/`abandoned: true`

### Phase 3 commits — Critical Claim Path + SKILL.md
8. `cmdStartup` owned branch: add `worktree_path` (from lock file) to `writeStartupReceipt`
9. `cmdStartup` acquired branch: same
10. `cmdPickNext`: add `worktree_path` to persisted receipt
11. `kaola-workflow-next/SKILL.md`: extract `worktree_path` after PICK_NEXT_PROJECT, export as
    `KAOLA_WORKTREE_PATH`
12. Add comment preserving `target_mismatch` NO-WRITE invariant (no code change)

### Phase 4 — Regression Tests (new Epic 17P–17V)
- 17P: `cmdStatus` CLOSED issue → drift contains `'issue closed'`, `consistent: false`
- 17Q: `cmdWorktreeStatus` CLOSED issue → entry has `closed: true`
- 17R+: `scanPhaseArtifacts` with `pending` phase4 row → routes to phase4
- 17R-: `scanPhaseArtifacts` with all-complete phase4 rows → routes to phase5
- 17S: startup owned receipt includes non-null `worktree_path`
- 17S': target_mismatch receipt unchanged after second startup call (NO-WRITE invariant)
- 17T+: `removeWorktree` last sibling → parent `*.kw/` removed
- 17T-: `removeWorktree` with sibling → parent `*.kw/` retained
- 17U: `cmdSweep` removes `.abandoned-old` (suffix >30min) but not `.abandoned-fresh`
- 17V: `cmdWorktreeStatus` second pass surfaces unregistered dir with `registered: false`

## Out of Scope (explicit)
- No new JS modules
- No new external dependencies
- No changes to `cmdStartup` target_mismatch branch (issue-44 HIGH invariant)
- No changes to `GC_CUTOFF_MS` constant
- No edits to Codex-only scripts or plugin runtime cache
- No label/assignee cleanup on closed issues (out of scope per phase1 notes)
- Issue #47 auto-pick bootstrap (separate issue)

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
