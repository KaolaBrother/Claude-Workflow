# Phase 2 - Ideation: issue-119

## Approaches Evaluated

### Option A: Mirror GitHub — module constant + early-return inside `ensure*` + gate `--merge` (SELECTED)
- **Summary**: Add `const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';` at module top; early-return block inside `ensurePullRequest`/`ensureMergeRequest` before push and `discoverProject`; gate `--merge` with `!OFFLINE` in both `main()` functions; return placeholder shapes matching online return types.
- **Pros**: Exact parity with 3 existing precedents (sink-pr.js:7, kaola-gitea-forge.js:6, kaola-gitlab-forge.js:6); security asserts still fire for online path; library callers (not just CLI) get offline behavior; subprocess tests are the required pattern anyway.
- **Cons**: `OFFLINE` not toggleable in-process — offline tests must be subprocess (already the established pattern).
- **Risk**: Low
- **Complexity**: Small

### Option B: Early-return in `main()` only (CLI-level)
- **Summary**: Guard in each `main()` before calling `ensure*`; short-circuit before the exported function is called.
- **Pros**: Slightly fewer lines.
- **Cons**: Library callers bypass the guard; diverges from GitHub; push/discoverProject/createPR are inside `ensure*` not `main()` so logic must be duplicated.
- **Risk**: Medium
- **Complexity**: Small

### Option C: Push guard into forge layer
- **Summary**: Make `forge.discoverProject`/`createPullRequest`/`createMergeRequest` return deterministic placeholders offline.
- **Pros**: None meaningful.
- **Cons**: Wrong layer (forge has no knowledge of workflow-state.md); largest blast radius; touches shared modules used by other sinks; placeholder URL/number assembly still has to happen in sink.
- **Risk**: High
- **Complexity**: Large

## Advisor Findings
- Option A endorsed without modification.
- `--merge` gating is necessary (not optional): offline runs must not invoke `forge.merge*` on placeholder IIDs.
- Three pre-edit verifications required in Phase 3: (1) Gitea `updateStateSinkBlock` arity, (2) `appendSummary` creates-if-missing, (3) GitLab `mr` return shape beyond `mr_url`/`mr_iid`.
- All edits must happen in the worktree at `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-119/`, not the main checkout.

## Selected Approach
**Option A — Mirror GitHub module constant + early-return inside `ensure*` + gate `--merge`**

Rationale: The only option achieving true forge parity with the GitHub sink; keeps offline behavior consistent for both CLI and library callers; stays surgical (4 files, 2 sinks + 2 test files); the advisor independently confirmed this is the correct direction without modifications.

The additional `--merge` gate in `main()` is part of the selected approach — the Phase 1 fact that `main()` calls `merge*` unconditionally was underspecified, and the advisor flagged this as necessary.

## Out of Scope (explicit)
- No change to `kaola-gitea-forge.js` `discoverProject` (early-return renders its `git remote` fallback unreachable; leave for a separate ticket)
- No change to `kaola-gitlab-forge.js`
- No new env vars beyond `KAOLA_WORKFLOW_OFFLINE`
- No in-process OFFLINE-toggle tests (impossible with module-load constant)
- No refactor of `skipPush` / `skipMetadataCommit` (orthogonal)
- No changes to `mergePullRequest`/`mergeMergeRequest` signatures
- No changes to sink-merge scripts
- No CHANGELOG edits (Phase 6 handles documentation)

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
