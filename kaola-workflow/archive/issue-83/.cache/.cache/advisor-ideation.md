# Advisor — Ideation Gate: Issue #83

## Verdict: Proceed with 1A + 2A + 3A

The three recommended approaches are correct, surgical, and match the no-command-file constraint.

## Required Corrections Before Phase 3

### 1. Phase 1 factual error
`phase1-research.md` Key Pattern #2 incorrectly states GitHub uses `activeByProject` for the
fallback guard. The actual GitHub code is `fs.existsSync(projectDir(root, args.project))` at
`scripts/kaola-workflow-claim.js:547-561`. Propagating the wrong pattern to the architect would
cause a divergent implementation. Corrected in phase2-ideation.md.

### 2. AC #4 end-state must be explicit
After archive, the fallback chain is:
- sink-merge exits 3 → sink-fallback returns `{updated: false, reason: 'project archived'}`
- sink-mr creates MR via glab → `updateStateSinkBlock` returns false (state file gone)
- `appendSummary` returns false (dir gone)

Result: MR exists on GitLab but no metadata persists anywhere; `watch-pr` cannot close the
workflow automatically. This is the accepted end-state for the exit-3 fallback-after-archive
scenario. Documenting explicitly in phase2-ideation.md so it's not a silent gap.

## Sharpening Notes

### Keep `resolveProjectFile` private
Private to `sink-merge.js` only, resolving only `phase6-summary.md` and `workflow-state.md`.
Do not generalize into a shared module — two call sites don't justify abstraction.

### `isSafeName` addition in Bug 2 is a hardening side-effect
The `isSafeName` guard is new behavior for GitLab `cmdSinkFallback` (GitHub already has it).
It can't break a clean caller; phase6.md never passes unsafe names. Call it out explicitly in
phase2-ideation.md under "Out of Scope side-effects" to prevent reviewer confusion.

### Integration test gap
Test plan is unit-heavy. AC #4 ("exercises... fallback after finalization") requires at least
one end-to-end integration scenario in `simulate-gitlab-workflow-walkthrough.js`:
- Archive the active folder
- Run the sink dispatch chain
- Assert no throws and archive directory is byte-unchanged after the run

Add this to the task list in Phase 3.
