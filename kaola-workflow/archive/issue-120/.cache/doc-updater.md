# Documentation Updates for Issue #120

**Date**: 2026-05-20  
**Agent**: Claude Code (Documentation Specialist)

## Summary

Updated documentation to reflect the port of `assertNoLiveWorkflowFolder` guard to Gitea and GitLab direct-merge sinks. All three forge editions (GitHub, GitLab, Gitea) now refuse to merge branches with live workflow-state.md files committed in HEAD.

## Changes Made

### 1. CHANGELOG.md

**File**: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/CHANGELOG.md`

**Change**: Added entry under `[Unreleased]` → `### Fixed` section:

```
- Port `assertNoLiveWorkflowFolder` guard to Gitea and GitLab direct-merge sinks; 
  both sinks now refuse to merge a branch whose HEAD still contains the live 
  workflow-state.md (issue #120)
```

**Context**: This change documents the defensive guard that prevents incomplete workflows (missing finalization) from being accidentally merged into main.

### 2. docs/api.md — Merge Sink Section

**File**: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/docs/api.md`

**Changes**:

1. **Updated Script line** (line 11):
   - Old: `kaola-workflow-sink-merge.js` (GitHub) / `kaola-gitlab-workflow-sink-merge.js` (GitLab)
   - New: Added `/ kaola-gitea-workflow-sink-merge.js` (Gitea)

2. **Updated Contract section** (line 13-15):
   - Added Gitea CLI reference to the technology list

3. **New subsection**: Added **Live workflow-state guard** (`assertNoLiveWorkflowFolder`):
   - Explains guard behavior: refuses merge if `kaola-workflow/{project}/workflow-state.md` exists in HEAD
   - Documents mechanism: uses `git cat-file -e HEAD:{path}` to inspect committed tree
   - Documents exit behavior: exits 1 with remediation instructions
   - Notes purpose: guards against accidentally merging incomplete workflows

4. **Updated Exit codes** (line 20-22):
   - Updated exit code 1 description to include live workflow-state guard failures
   - Updated exit code 3 description to include "(GitLab/Gitea guard)" alongside archive checks

5. **Updated Failure classification** (line 23-26):
   - Changed "Exported from both GitHub and GitLab" → "Exported from all three sink-merge modules (GitHub, GitLab, Gitea)"
   - Updated test hook note to say "GitLab and Gitea additionally support" instead of "GitLab additionally supports"

6. **Updated Offline support** (line 27):
   - Changed "applies to both editions" → "applies to all three editions"

## Verification

- Verified that `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` exists and contains implementation
- Verified that `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` exists and contains implementation
- Verified that `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/scripts/kaola-workflow-sink-merge.js` (GitHub edition) contains the `assertNoLiveWorkflowFolder` function definition
- Confirmed all file paths are absolute and verified to exist

## Documentation Quality Checklist

- [x] Codemaps: Not applicable (documentation update only)
- [x] File paths verified: All three sink-merge scripts exist
- [x] CHANGELOG entry added: Concise, under Fixed section
- [x] API docs updated: Comprehensive Merge Sink section now covers all three editions
- [x] Freshness: Updated with current date
- [x] Cross-references: Links all three forge editions consistently
- [x] No obsolete references: Updated all "both editions" mentions to "all three editions"

## Impact

This documentation update ensures that:
1. Users understand the `assertNoLiveWorkflowFolder` guard exists in all forge editions
2. The remediation instructions are discoverable in API docs
3. Consistency across GitHub, GitLab, and Gitea implementations is documented
4. CHANGELOG accurately reflects defensive improvements in Phase 6 sink stability
