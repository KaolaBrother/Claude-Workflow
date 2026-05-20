# Planner Output — Issue #128

## Recommendation: Option B (Inline check, no helper refactor)

## Verified Architecture Facts
- `assertCleanWorktree(gitExec)` in GitLab/Gitea takes a function (not `mainRoot`). Its `gitExec`-function signature is COHERENT with `fastForwardMain`'s cwd-relative injectable model — not a mistake.
- `fastForwardMain` IS exported public API (GitLab line 345, Gitea line 344). Refactoring its helper caller would change public API — out of scope.
- Real `main()` pipeline uses `execFileSync` directly with `-C mainRoot`. `mainRoot` is in scope from line 267/268.
- GitHub's inline guard message: `'Worktree must be clean before sink-merge checks out the requested branch'`
- GitLab/Gitea helper message: `'Worktree must be clean before direct merge sink runs'`
- These differ. Tests should assert on common prefix `'Worktree must be clean'`.
- Dirty-worktree test must dirty a TRACKED file (`README.md`) — the guard uses `--untracked-files=no`.

## Option A — Refactor helper to assertCleanWorktree(mainRoot)
- Summary: Change helper signature to match GitHub; update fastForwardMain call; add new call in pipeline.
- Pros: Aligns helper signature with GitHub baseline
- Cons: Touches `fastForwardMain` (exported public API); breaks cwd-relative injectable contract; disproportionate to issue scope
- Risk: Medium | Complexity: Medium

## Option B — Inline check in real pipeline (Recommended)
- Summary: Insert 2-line guard directly in the production pipeline (after OFFLINE-guarded fetch, before checkout). No changes to existing helper or fastForwardMain.
- Pros: Smallest change; leaves helper and fastForwardMain fully intact; exactly one new call site per file matching GitHub position and behavior
- Cons: Small duplication of guard logic (acceptable — one site per file); message string differs from existing helper
- Risk: Low | Complexity: Small

## Option C — Second helper assertCleanWorktreePath(mainRoot)
- Summary: Add new function alongside existing helper; call it in the real pipeline
- Pros: Named function
- Cons: Two near-identically-named functions for what is effectively one new call site; unnecessary API surface
- Risk: Low | Complexity: Small

## Implementation Sites (Option B)
- GitLab: insert between line 300 (close of OFFLINE fetch block) and line 302 (checkout call):
  ```js
  const status = execFileSync('git', ['-C', mainRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before sink-merge checks out the requested branch');
  ```
- Gitea: identical insertion between line 299 and line 301
- GitLab test: new subprocess block after line 568 — `setupRealRepo` + dirty `README.md` + assert exit 1 + `'Worktree must be clean'`; pass `--root root`
- Gitea test: "Test 21" after line 535 — same but no `--root` flag

## Explicitly NOT to Build
- No edits to GitHub's plugin copy (already correct)
- No shared/extracted module across plugins
- No refactor of existing `assertCleanWorktree(gitExec)` or `fastForwardMain`
- No OFFLINE gating on the new guard
- No change to `assertNoLiveWorkflowFolder` position

## CHANGELOG
Add entry under [Unreleased] for GitLab/Gitea clean-worktree guard parity with GitHub.

## Missing Facts
None.
