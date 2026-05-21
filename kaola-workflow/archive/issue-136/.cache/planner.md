# Planner Output — Issue #136

## Critical Finding
`issueIsClosed()` is NOT reliably true at `cmdFinalize` time on the merge path.
The GitHub issue closes AFTER the branch merges to main (via `Closes #N`), i.e. AFTER `cmdFinalize` ran.
Gate on `statusValue === 'closed'` (caller intent), NOT on remote state.

Phase 6 ordering:
1. Step 7: `rm -f .roadmap/issue-N.md` + `generate` (prose, pre-commit)
2. Step 8b: `cmdFinalize` → archives folder
3. Step 8: commit stages everything onto feature branch
4. GitHub issue closes on merge to main (AFTER all of the above)

## Approach A — Chokepoint in `archiveProjectDir`, gated on `statusValue === 'closed'`

Add roadmap cleanup inside `archiveProjectDir` (claim.js:411-440), triggered ONLY when `statusValue === 'closed'`.
Extract issue_number from state file (already read at line 417 via existing field() helper).
Delete `.roadmap/issue-N.md`, then regenerate ROADMAP.md.

- cmdFinalize passes 'closed' → cleanup runs
- watch-pr MERGED passes 'closed' → cleanup runs
- cmdRelease passes 'abandoned' → cleanup SKIPPED (correct: issue stays open)
- watch-pr CLOSED passes 'abandoned' → cleanup SKIPPED (correct)

**Pros**: Single chokepoint, covers all current and future closure paths, works offline, cmdRelease exclusion automatic
**Cons**: Cross-script concern (claim.js calling roadmap generation)
**Risk**: Medium (cross-worktree tree placement, subprocess invocation)
**Complexity**: Small

## Approach B — Explicit per-site calls

Add `removeRoadmapSource(root, issueNumber)` helper, call from cmdFinalize + watch-pr MERGED explicitly.

**Pros**: Keeps archiveProjectDir single-purpose, explicit policy at call sites
**Cons**: Two sites to maintain, reintroduces skippability in code
**Risk**: Low-Medium (future closure path could forget)
**Complexity**: Small

## Approach C — `validate --remote` only (lazy reconciliation)

Leave closures alone; add `--remote` mode to validate that calls issueIsClosed() for each .roadmap/ file.

**Cons**: Does NOT satisfy AC #1/#3 at closure time. N GitHub calls per validate. Cannot be primary fix.
**Fit**: Good as COMPLEMENT only.

## Recommendation: A + thin C

**Primary fix (A)**: roadmap cleanup in archiveProjectDir on statusValue === 'closed'; regenerate ROADMAP.md; regression test.
**Safety net (C)**: `validate --remote` audit-only (+ optional --fix), with OFFLINE short-circuit.

## Out of Scope
- Do NOT make cmdRelease / watch-pr-CLOSED delete .roadmap/issue-N.md
- Do NOT gate write-time cleanup on issueIsClosed()
- Do NOT make generate call GitHub
- Do NOT rewrite Phase 6 Step 7 prose (script automation makes it redundant)
- Do NOT add daemon/cron

## Open Items
1. How to invoke regeneration from claim.js: shell out vs require (roadmap script has NO module.exports)
   - Shell out: matches existing prose pattern, no new coupling, adds subprocess
   - Require + export: cleaner but needs export change to roadmap.js
   - Recommendation: shell out (simpler, lower risk)
2. Issue-number source in archiveProjectDir: use field() on state file already read at line 417
   Fallback: parse project name "issue-N"
3. Cross-worktree test: confirm .roadmap/ deletion lands in branch tree and staged by git add -A (lines 458-463)

## Key Files
- scripts/kaola-workflow-claim.js: archiveProjectDir 411-440; cmdFinalize 442-467; cmdRelease 475-485; cmdWatchPr 578-603
- scripts/kaola-workflow-roadmap.js: cmdGenerate 187-196; cmdValidate 225-239; no module.exports (line 303 is require.main block)
- scripts/kaola-workflow-active-folders.js: issueIsClosed 38-48, exported 118
- scripts/simulate-workflow-walkthrough.js: gh shim + plant helpers 329-379
