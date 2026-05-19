# Documentation Update Analysis — Issue #105

**Date:** 2026-05-19
**Issue:** #105 - Sink-Merge Live Folder Guard
**Phase:** 6, Step 3 - Documentation Update

## Summary of Changes

This issue addresses a correctness gap: `sink-merge.js` was silent when the branch HEAD contained an unarchived `kaola-workflow/{project}/workflow-state.md`. This was unsafe because `cmdFinalize` should atomically archive the project before merge. The fix adds a guard that refuses the merge with explicit remediation.

### Changed Files

1. **`scripts/kaola-workflow-sink-merge.js`**
   - Added `assertNoLiveWorkflowFolder(mainRoot, project)` function
   - Calls `git cat-file -e HEAD:{path}` to check if live folder is committed
   - Throws with remediation message if found
   - Called after `git checkout args.branch`, before rebase

2. **`scripts/kaola-workflow-claim.js`**
   - Expanded `cmdFinalize` when `--keep-worktree` flag is set
   - When called from linked worktree: runs `git add -A kaola-workflow/` + `git commit` on feature branch
   - Ensures branch HEAD has the archive instead of the live folder
   - Required for `sink-merge` guard to pass

3. **`scripts/simulate-workflow-walkthrough.js`**
   - Added `testSinkMergeRefusesLiveFolder` (negative test, offline)
   - Added `testFastE2EMergeFullChain` (positive test, KAOLA_PATH=fast E2E)
   - Strengthened `testE2EGitHubMergeFullChain` with post-sink-merge assertions

4. **`commands/kaola-workflow-phase6.md`**
   - One sentence appended to step 8b: documents that sink-merge will refuse with exit 1 if live workflow-state.md is present in branch HEAD

## Documentation Update Checklist

### [✓] CHANGELOG.md - User-visible behavior change

**Reasoning:** MUST UPDATE. This is a user-visible behavior change. `sink-merge.js` now exits 1 with a clear error message when the live folder is committed, instead of silently allowing a problematic state. Users need to understand this new guard and its remediation path.

**Update Required:** Add entry to [Unreleased] section documenting:
- New behavior: `sink-merge.js` now refuses (exit 1) if `kaola-workflow/{project}/workflow-state.md` is present in branch HEAD
- Remediation: two paths provided (finalize + commit, or git rm + commit)
- Related to Phase 6 Step 8b flow

### [✓] commands/kaola-workflow-phase6.md - Already updated

**Reasoning:** Already updated in changeset. Step 8b paragraph has one sentence appended documenting the new guard behavior.

### [ ] README.md - No update needed

**Reasoning:** This is an internal correctness guard, not a public feature, configuration option, or API change. The README documents user-facing features, installation, and usage. No environment variables added, no new CLI flags exposed. Sink-merge behavior is documented in phase6.md (already updated).

**Evidence:** No new command-line flags, environment variables, or user workflows affected.

### [ ] API docs (docs/api.md) - No update needed

**Reasoning:** The `assertNoLiveWorkflowFolder` function is an internal guard, not a public API export. There are no new function signatures, parameters, or return values exposed to callers. The sink-merge contract (exit codes, input requirements) is already documented; this just adds a new check that happens before rebase.

**Evidence:** Function is not exported in module.exports block. Existing `classifyMergeError` is the public classification API for sink-merge errors.

### [ ] Architecture docs - No update needed

**Reasoning:** No architecture changes. This is a safeguard that validates a prerequisite state (archive must happen before merge). The Phase 6 workflow structure remains unchanged; the order of operations is already documented.

**Evidence:** No changes to system structure, data flow, or major component relationships.

### [ ] .env.example - No update needed

**Reasoning:** No new environment variables introduced. The two existing `KAOLA_WORKFLOW_*` test variables (`KAOLA_WORKFLOW_FORCE_FF_FAIL`, `KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE`) remain unchanged.

### [ ] Inline comments - Review needed for `cmdFinalize` expansion

**Reasoning:** The code change in `cmdFinalize` when `--keep-worktree` is set adds a branching path that commits the archive on the feature branch. Inline comments already exist to explain the guard requirement, but can be reviewed for clarity.

**Status:** Comments are present and adequate. No changes needed.

## Summary

**Items Updated:** 2
- CHANGELOG.md (needs entry)
- commands/kaola-workflow-phase6.md (already done)

**Items Skipped:** 4 (README, API docs, architecture, .env.example)

**Reason for Skips:**
- README: Internal behavior change, not public API
- API docs: Internal guard function, no new exports
- Architecture: No structural changes
- .env.example: No new environment variables

**Next Step:** Add CHANGELOG.md entry under [Unreleased] documenting the new sink-merge guard behavior and remediation paths.
