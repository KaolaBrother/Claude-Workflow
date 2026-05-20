# Phase 2 - Ideation: issue-120

## Approaches Evaluated

### Option A: Verbatim copy — add assertNoLiveWorkflowFolder to both sinks (SELECTED)
- **Summary**: Copy `assertNoLiveWorkflowFolder(mainRoot, project)` verbatim from GitHub sink into both Gitea and GitLab sinks; call it immediately after checkout in each. Add `setupRepoWithLiveFolderOnBranch` helper and one subprocess test per plugin.
- **Pros**: Exact parity with GitHub baseline; no scope creep; all helpers already in scope (`execFileSync`, `assert`); no new imports.
- **Cons**: Code duplication across 3 sinks (accepted: plugin install boundary makes shared module out of scope).
- **Risk**: Low
- **Complexity**: Small

### Option B: Shared helper extracted to common module
- **Summary**: Move function to a shared utility required by all three sinks.
- **Pros**: DRY.
- **Cons**: Crosses plugin install boundary (`install.sh --forge=gitea` vs `--forge=gitlab` install independently); requires contract validator changes, vendoring changes, and `install.sh` changes — all out of scope for #120.
- **Risk**: High
- **Complexity**: Large

### Option C: Minimal variant with shorter error message
- **Summary**: Shorter message, fewer remediation paths.
- **Pros**: Fewer characters.
- **Cons**: Gives worse UX than GitHub without saving implementation effort (it's still a copy-paste).
- **Risk**: Low
- **Complexity**: Small (but wrong direction)

## Advisor Findings
- Option A endorsed: planner's rejections of B and C are accurate.
- Advisor carry-over #1: Resolve `kaola-workflow/archive/issue-118/phase6-summary.md` dirty state before Phase 6 sink-merge. Recommended: `git restore kaola-workflow/archive/issue-118/phase6-summary.md` (safe — diff was just retroactive commit hash annotation).
- Advisor carry-over #2: For roadmap deletion in Phase 6, use `git rm -f kaola-workflow/.roadmap/issue-120.md` instead of `rm -f` to avoid `AD` index state.

## Selected Approach
**Option A — Verbatim copy of assertNoLiveWorkflowFolder**

Key constraints:
- Do NOT add `assertCleanWorktree` to either Gitea/GitLab sink (GitHub-only).
- Error message verbatim including `<worktree>` and `<claim.js>` placeholders.
- GitLab test must pass `--root root` (matches existing test convention); Gitea test does NOT.
- `setupRepoWithLiveFolderOnBranch` helper commits live folder to feature branch before returning to main.
- Dual assertion: exit code 1 AND stderr substring.

## Out of Scope (explicit)
- `assertCleanWorktree` in Gitea/GitLab sinks
- Issue #113 (Gitea claim script — generic placeholders stay)
- Shared module extraction
- GitHub plugin or root `scripts/` changes
- `assertNoLiveWorkflowFolder` in archive paths or sink-fallback paths

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
