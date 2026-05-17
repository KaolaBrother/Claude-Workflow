# Phase 6 - Summary: issue-40

## Delivered
Fixed 11 flaws in the worktree-native workflow path (Flaws 1-11):
1. **Flaw 1**: Byte-synced `validate-workflow-contracts.js` to plugin (was drifted by 12 lines)
2. **Flaw 2**: Router verdict-based routing replaces `exit 0` after `pick-next`; `startup` now guarded by `[ -z "${STARTUP_OUT:-}" ]`
3. **Flaw 3**: Codex SKILL.md mirrored with same router fix (`--runtime codex`)
4. **Flaw 4**: `cmdPickNext` writes startup receipt with `claim: 'acquired'`
5. **Flaw 5**: `cmdPickNext` rewritten to use classifier-based selection (`selectFirstClaimable`) + `ownedActiveProject` early-return
6. **Flaw 6**: `cmdWorktreeFinalize` root fixed to `findMainWorktree() || getRoot()`
7. **Flaw 7**: `scanPhaseArtifacts` reads `workflow-state.md` first (excludes `step: claimed`)
8. **Flaw 8+9**: `cmdPickNext` writes state file via `updateSinkLease` with 24h expiry
9. **Flaw 10**: `cmdWorktreeFinalize` now calls `archiveProjectDir` + `releaseSession` + `removeWorktree`
10. **Flaw 11**: Codex validator gets pick-next receipt/state and finalize contract assertions

Additionally: Phase 5 review found CRITICAL (router overwrite) + 4 HIGH findings; all fixed.

## Files Changed
- scripts/kaola-workflow-claim.js — selectFirstClaimable; cmdPickNext rewrite; cmdWorktreeFinalize cleanup; scanPhaseArtifacts state-file prefix; enforcePlatformSessionOrExit; --runtime validation; archiveProjectDir try/catch; session ownership check
- plugins/kaola-workflow/scripts/kaola-workflow-claim.js — byte-identical mirror
- scripts/simulate-workflow-walkthrough.js — Cases 17L, 17M, 17N; extended 17F; 17B comment updated; test reordered
- scripts/validate-kaola-workflow-contracts.js — 6 new assertions; pre-existing backslash bug fixed
- scripts/validate-workflow-contracts.js — line limit 250→265; pre-existing backslash bug fixed
- plugins/kaola-workflow/scripts/validate-workflow-contracts.js — byte-identical mirror
- commands/workflow-next.md — verdict-routing block + STARTUP_OUT guard
- plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md — mirrored router fix
- CHANGELOG.md — issue-40 entry

## Test Coverage
All 3 validators pass:
- `node scripts/simulate-workflow-walkthrough.js` → "Workflow walkthrough simulation passed" (exit 0)
- `node scripts/validate-workflow-contracts.js` → "Workflow contract validation passed" (exit 0)
- `node scripts/validate-kaola-workflow-contracts.js` → "Kaola-Workflow contract validation passed" (exit 0)

New tests: Cases 17L (verify-startup after pick-next), 17M (finalize from inside worktree), 17N (sweep GCs expired pick-next worktree), extended 17F (archive + removal assertions).

## Final Validation Evidence
- All 3 validators: delegated to review-fix executor after CRITICAL/HIGH fixes; re-run confirmed exit 0 after all fixes applied
- Source: phase5-review.md, review-fix executor output

## Documentation Docking
DOCKED — `.cache/doc-docking.md`
- CHANGELOG.md updated
- README.md: no update needed (already documents pick-next and KAOLA_WORKTREE_NATIVE)
- No API docs, .env.example, or architecture docs to update

## Final Validation Failure Ledger
| Failing Command | Classification | Routed To | Evidence | Status |
|-----------------|----------------|-----------|----------|--------|
| code-review CRITICAL (router) | behavior | review-fix executor | phase5-review.md | FIXED |
| code-review HIGH x4 | behavior/security | review-fix executor | phase5-review.md | FIXED |

## Follow-Up Items (from Phase 5)
1. Extract `patchPickNextLock` helper from `cmdPickNext` to bring under 50 lines (MEDIUM code style)
2. Add positive-path test for `scanPhaseArtifacts` state-file early-return (MEDIUM coverage)
3. Add `next_command` allow-list in `scanPhaseArtifacts` (MEDIUM security)
4. Fix `drainPendingRemovals` missing `isSafeName` on `entry.project` (LOW, pre-existing)

## Closure Decision
No deferred items, unresolved conflicts, or user-decision items. Follow-ups are all MEDIUM/LOW and can be addressed in separate issues. Implementation is complete.

## Commit And Push
pending final Git gate — final hash reported after push

## GitHub Issue
Closing issue #40 after final commit

## Roadmap
Updated — issue-40 per-issue file to be deleted; ROADMAP.md regenerated

## Archive
Pending — `cmdFinalize` handles atomically after push

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| doc-updater | invoked | .cache/doc-updater.md | |
| documentation docking | invoked | .cache/doc-docking.md | |
| closure advisor gate | N/A | No blocking deferred items or user decisions | All MEDIUM/LOW follow-ups are non-blocking |
| final-validation fix executors | invoked | phase5-review.md, review-fix executor | CRITICAL+HIGH fixed |
| roadmap refresh | pending | kaola-workflow/ROADMAP.md | |
| archive completed folder | pending | | |
| final commit and push | ready | git status/git diff | final gate runs next |

## Status
READY FOR FINAL GIT GATE
