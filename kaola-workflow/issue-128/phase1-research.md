# Phase 1 - Research / Discovery: issue-128

## Deliverable
Add a `assertCleanWorktree` call in the GitLab and Gitea real direct-merge pipelines (`runDirectMerge` non-skipGit path) between the fetch step and the checkout step, matching the GitHub baseline. Add tests proving dirty tracked state causes the sink-merge to exit 1 before checkout.

## Why
GitLab and Gitea define the `assertCleanWorktree` helper but never call it in their production `runDirectMerge` pipeline. GitHub always calls it. Without the guard, a dirty tracked worktree may cause an opaque `git checkout` failure instead of the explicit, consistent remediation message the guard provides.

## Affected Area
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` — helper at lines 75–78 (signature mismatch, see below), legacy call at line 107; real pipeline insertion point between lines 300–302
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` — identical structure; insertion point between lines 300–302
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` — new subprocess dirty-worktree test (after line 568)
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` — new subprocess dirty-worktree test as "Test 21" (after line 535)

## Key Patterns Found

1. **GitHub call site** (`scripts/kaola-workflow-sink-merge.js:264`): `assertCleanWorktree(mainRoot)` called after OFFLINE-guarded fetch and before checkout. Signature takes `mainRoot: string`, uses module-scoped `execFileSync` with `-C mainRoot`.

2. **GitLab/Gitea helper signature mismatch**: Existing `assertCleanWorktree(gitExec)` takes a function (lines 75–78 in both files). The real `runDirectMerge` pipeline has NO `gitExec` variable in scope — it uses `execFileSync` directly. Phase 2 must decide: (A) refactor helper to match GitHub signature `assertCleanWorktree(mainRoot)` and update `fastForwardMain` call at line 107, or (B) other approach.

3. **Insertion point** (`kaola-gitlab-workflow-sink-merge.js:300–302`, `kaola-gitea-workflow-sink-merge.js:300–302`): After the OFFLINE-guarded `fetch origin` block, before `execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], ...)`. `mainRoot` is in scope from line 267/268.

4. **Error propagation**: `assertCleanWorktree` → `assert(!status, msg)` → throws `Error(msg)`. Top-level `main()` catch block writes `err.message` to stderr and sets `process.exitCode = 1`.

5. **Subprocess test model** (`test-gitlab-sinks.js:555–568`, `test-gitea-sinks.js:522–535`): `spawnSync` with `KAOLA_WORKFLOW_OFFLINE: '1'`, assert `status === 1` and `stderr.includes('...')`. GitLab passes `--root` flag; Gitea does not. New dirty-worktree test: `setupRealRepo` → write tracked-file dirt on `main` without committing → run sink-merge → assert exit 1 + error message.

6. **OFFLINE and the guard**: `assertCleanWorktree` runs unconditionally (no OFFLINE gate). Test can set `KAOLA_WORKFLOW_OFFLINE=1` to skip fetch; the guard still runs.

## Test Patterns
- Framework: hand-rolled assert (no external framework)
- GitLab location: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` (after existing live-folder guard block at line 568)
- Gitea location: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` (after Test 20 at line 535, label as Test 21)
- Structure: `spawnSync` subprocess test using `setupRealRepo`, dirty-file setup, assert status 1 + stderr contains clean-worktree error message

## Config & Env
- `KAOLA_WORKFLOW_OFFLINE=1` — set in tests to skip network fetch; guard runs regardless
- No new env vars needed

## External Docs
None required.

## GitHub Issue
KaolaBrother/Kaola-Workflow#128

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | internal Node.js patterns; no external library behavior needed |

## Notes / Future Considerations
- Phase 2 must decide whether to refactor the GitLab/Gitea helper signature to match GitHub's `assertCleanWorktree(mainRoot)` (option A) or handle the mismatch another way. Option A is cleanest: it aligns all three forges and requires updating only the one existing `fastForwardMain` call at line 107 in each file.
- The `assertCleanWorktree` check should NOT be gated on OFFLINE — it should run unconditionally just as GitHub does, since dirty worktree is a local state issue independent of network connectivity.
