# Phase 2 - Ideation: issue-128

## Approaches Evaluated

### Option A: Refactor helper to assertCleanWorktree(mainRoot)
- Summary: Change the `assertCleanWorktree(gitExec)` helper signature in GitLab/Gitea to match GitHub's `assertCleanWorktree(mainRoot)` signature; update the one existing `fastForwardMain` call at line 107 in each file; add new call in the real pipeline.
- Pros: Aligns helper signature with GitHub baseline; single named function for the guard
- Cons: Touches `fastForwardMain` (exported public API); breaks the cwd-relative injectable contract that `fastForwardMain` relies on; disproportionate to issue scope
- Risk: Medium | Complexity: Medium

### Option B: Inline check in real pipeline (Recommended)
- Summary: Insert a 2-line inline guard directly in the production `runDirectMerge` pipeline (after the OFFLINE-guarded fetch block, before checkout). No changes to the existing `assertCleanWorktree(gitExec)` helper or `fastForwardMain`. Matches GitHub's guard position and behavior exactly.
- Pros: Smallest possible change; leaves helper and `fastForwardMain` fully intact; exactly one new call site per file at the correct position; no public API surface changed
- Cons: Small duplication of guard logic (acceptable — one site per file; helper and inline share no common caller path); error message string differs from existing helper (tests assert on common prefix `'Worktree must be clean'`)
- Risk: Low | Complexity: Small

### Option C: Second helper assertCleanWorktreePath(mainRoot)
- Summary: Add a new exported function alongside the existing helper; call it in the real pipeline
- Pros: Named function; no signature change to existing helper
- Cons: Two near-identically-named functions for what is effectively one new call site; unnecessary API surface
- Risk: Low | Complexity: Small

## Advisor Findings

Advisor confirmed Option B. The existing helper's `gitExec`-function signature is coherent with `fastForwardMain`'s cwd-relative injectable model — it is not a mistake. Touching `fastForwardMain` (exported public API) is out of scope. Mild preference to use error message `'Worktree must be clean before direct merge sink runs'` in the inline guard to keep GitLab/Gitea consistent with each other. Tests assert on common prefix `'Worktree must be clean'`. Phase 3 must re-verify exact line numbers from worktree files before locking in insertion points.

See: `.cache/advisor-ideation.md`

## Selected Approach

**Option B — Inline check in real pipeline**

Rationale: Smallest change that achieves parity with GitHub. Leaves `fastForwardMain` (exported public API) and the existing `assertCleanWorktree(gitExec)` helper completely intact. One new 2-line insertion per file at the confirmed insertion point (after fetch block, before checkout), with `mainRoot` already in scope. Disjoint write sets across GitLab, Gitea, and tests allow parallel Phase 4 tasks.

## Implementation Plan (Phase 3 will formalize)

- GitLab: insert between end of fetch block and checkout call in `kaola-gitlab-workflow-sink-merge.js`
- Gitea: identical insertion in `kaola-gitea-workflow-sink-merge.js`
- GitLab test: new subprocess dirty-worktree block in `test-gitlab-sinks.js` (after live-folder block)
- Gitea test: "Test 21" in `test-gitea-sinks.js` (after Test 20)
- CHANGELOG: add entry under [Unreleased]

## Out of Scope (explicit)

- No edits to GitHub's plugin copy (`scripts/kaola-workflow-sink-merge.js`) — already correct
- No edits to Codex mirror (`plugins/kaola-workflow/scripts/`) — only GitHub copy is synced there
- No shared/extracted module across plugins
- No refactor of existing `assertCleanWorktree(gitExec)` or `fastForwardMain`
- No OFFLINE gating on the new guard
- No change to `assertNoLiveWorkflowFolder` position

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
