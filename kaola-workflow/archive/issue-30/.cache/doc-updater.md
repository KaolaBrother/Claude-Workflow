# Documentation Update Summary — Issue #30

**Date Updated**: 2026-05-16

## Changes Made

### README.md — Multi-Session Support Section

**Updated**: Lines 409-432 (now 409-480)

Added comprehensive documentation of the new worktree-per-session isolation feature:

1. **New Subsection: Session Leases & Coordination State**
   - Explains shared coordination state stored in `<repo>/.git/kaola-workflow/` (coordRoot)
   - Documents discovery via `git rev-parse --git-common-dir`
   - Clarifies that all linked worktrees share lock/session/ticker state

2. **New Subsection: Per-Session Git Worktrees**
   - Documents auto-provisioning at `<repo-parent>/<repo-name>.kw/<project>/`
   - Describes `KAOLA_WORKTREE_PATH` environment variable export
   - Lists full worktree lifecycle: removal on MERGED/sink-merge/release, `.abandoned-<ISO>` renaming for dirty worktrees, deferred removal handling

3. **New Subsection: Session State & Resumption**
   - Relocated existing session resumption logic for better organization
   - Added backwards-compatibility note about `migrateLegacyCoordState()`

### CHANGELOG.md

**Updated**: Lines 1-3 (new version header)

Added new version entry above existing 3.1.10:

- **Version**: 3.2.0 - 2026-05-16 (Claude Code) / Codex 1.2.0 - 2026-05-16
- **Scope**: Major feature (worktree isolation), hence MAJOR version bump
- **Content**:
  - Added: Shared coordRoot, backwards-compatible migration, per-session worktrees, `KAOLA_WORKTREE_PATH` env var, worktree lifecycle management, pre-commit hook update
  - Documentation: Multi-Session Support expansion
  - Tests: Epic Cases 15–16 with sub-assertions

## Files Modified

1. `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/README.md`
2. `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/CHANGELOG.md`

## Verification Checklist

- [x] README.md updated with coordRoot, worktree provisioning, `KAOLA_WORKTREE_PATH`, and lifecycle management
- [x] Multi-Session Support section reorganized into 3 clear subsections
- [x] CHANGELOG.md entry added with version 3.2.0 (MAJOR bump justified by new worktree isolation)
- [x] All key features documented: coordRoot, migration, provisioning, removal, environment variable
- [x] Backwards compatibility mentioned
- [x] Test cases (Epic 15–16) referenced
- [x] No broken links or references

## Implementation Reference

### Core Changes (from issue description)
- `scripts/kaola-workflow-claim.js` — `provisionWorktree()`, `removeWorktree()`, `migrateLegacyCoordState()`, `getCoordRoot()`
- `hooks/kaola-workflow-pre-commit.sh` — coordRoot lock resolution
- `scripts/kaola-workflow-repair-state.js` — coordRoot in projectOwner()
- `scripts/kaola-workflow-sink-merge.js` — `removeWorktree()` before branch delete
- `scripts/kaola-workflow-classifier.js` — readLockFiles coordRoot update
- `scripts/kaola-workflow-sink-pr.js` — coordRoot path helpers
- `plugins/kaola-workflow/scripts/` — all above mirrored
- `plugins/kaola-workflow/skills/*/SKILL.md` — 6 files with `cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true` shim

All implementation files exist and contain the documented functionality.

---

Documentation is now consistent with the implementation of issue #30.
