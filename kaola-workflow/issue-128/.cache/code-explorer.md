# Code Explorer Output — Issue #128

## Summary
GitHub's `runDirectMerge` calls `assertCleanWorktree(mainRoot)` between fetch and checkout. GitLab and Gitea define an identical-named helper but with a DIFFERENT signature (`gitExec` function, not `mainRoot` string), and their real production pipelines do NOT call it before checkout — only the legacy `fastForwardMain` path does.

## 1. assertCleanWorktree Pattern

### GitHub baseline (`scripts/kaola-workflow-sink-merge.js`, lines 64–69)
```js
function assertCleanWorktree(mainRoot) {
  const status = execFileSync('git', ['-C', mainRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before sink-merge checks out the requested branch');
}
```
- Signature: `(mainRoot: string)` — uses module-scoped `execFileSync` directly
- Error message: `'Worktree must be clean before sink-merge checks out the requested branch'`

### GitLab (`plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`, lines 75–78)
```js
function assertCleanWorktree(gitExec) {
  const status = gitExec('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!status, 'Worktree must be clean before direct merge sink runs');
}
```
- Signature: `(gitExec: function)` — **NOT `mainRoot`**
- Error message: `'Worktree must be clean before direct merge sink runs'`
- Called in `fastForwardMain` at line 107 (legacy path only)

### Gitea (`plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js`, lines 75–78)
Identical to GitLab — same `gitExec` signature, same error message.
Called in `fastForwardMain` at line 107 (legacy path only).

## 2. GitHub Call Site in runDirectMerge (lines 259–265)
```js
// Step 1 — git fetch (skip if OFFLINE; fatal throw on error)
if (!OFFLINE) {
  execFileSync('git', ['-C', mainRoot, 'fetch', 'origin'], { encoding: 'utf8' });
}

assertCleanWorktree(mainRoot);          // line 264
execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], ...);  // line 265
```

## 3. GitLab/Gitea Real Pipeline (runDirectMerge non-skipGit path)

Both GitLab (lines 247–328) and Gitea (lines 247–327) have structurally identical pipelines:

| Lines | Step | Code |
|-------|------|------|
| 260–264 | skipGit early return (not taken in real pipeline) | `if (options.skipGit) { ... return; }` |
| 267–268 | Resolve mainRoot | `const mainRoot = mainRootFromCoord(getCoordRoot(root));` |
| 270–278 | Early-exit if archived | |
| 280–295 | Step 0: exit hook + chdir + removeWorktree | |
| **297–300** | **Step 1: Fetch (OFFLINE-skipped)** | `if (!OFFLINE) { execFileSync('git', ['-C', mainRoot, 'fetch', 'origin'], ...) }` |
| **302–303** | **Checkout branch — NO guard before this** | `execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], ...)` |
| 304 | assertNoLiveWorkflowFolder | |
| 306–327 | Rest of pipeline | |

**Insertion point**: between the end of the fetch block (~line 300) and the checkout (~line 302). `mainRoot` is already in scope from line 267.

## 4. Critical Signature Mismatch
The existing `assertCleanWorktree(gitExec)` helper in GitLab/Gitea takes a `gitExec` function, but the real `runDirectMerge` production pipeline uses `execFileSync` directly with `-C mainRoot`. There is NO `gitExec` variable in scope within `runDirectMerge`. Resolution options:
- (A) Refactor the helper to match GitHub's signature `assertCleanWorktree(mainRoot)` — update `fastForwardMain` call at line 107 accordingly
- (B) Add a new overloaded call inline without touching the helper signature
Phase 2 will decide which option to use.

## 5. Error Handling Pattern
`assertCleanWorktree` throws via `assert(!status, msg)`. The module-level `assert` (line 11 of both files): `function assert(cond, msg) { if (!cond) throw new Error(msg); }`.

In `main()` → top-level entry (lines 337–339 GitLab / 337–338 Gitea):
```js
if (require.main === module) {
  try { main(); } catch (err) { process.stderr.write(err.message + '\n'); process.exitCode = 1; }
}
```
Assertion failure → `err.message` written to stderr, `exitCode = 1`.

Test verification:
- `result.status === 1`
- `(result.stderr || '').includes('Worktree must be clean before direct merge sink runs')`

## 6. Test Patterns

### Framework
Hand-rolled assert (no external test framework). Uses Node's built-in `assert` module.

### Subprocess helper functions (both test files)
- `tempRoot(name)` — `mkdtempSync` without git init
- `setupRealRepo(name, project)` — full git init + initial commit + feature branch + writeWorkflow, returns `{ root, branch }`
- `setupRepoWithLiveFolderOnBranch(name, project)` — extends setupRealRepo to commit live workflow-state.md on feature branch
- `writeWorkflow(root, project, issueNum, summary)` — writes workflow-state.md + phase6-summary.md
- `withForge(stubs, fn)` — monkey-patches forge module for in-process tests

### Existing subprocess test model (live-folder guard)
GitLab (`test-gitlab-sinks.js`, lines 555–568):
```js
{
  const sinkScript = path.join(__dirname, 'kaola-gitlab-workflow-sink-merge.js');
  const { root, branch } = setupRepoWithLiveFolderOnBranch('live-folder-gl-test', 'test-gl-live-folder');
  const result = spawnSync(process.execPath, [sinkScript, '--project', 'test-gl-live-folder', '--branch', branch, '--root', root], {
    cwd: root,
    env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' },
    encoding: 'utf8'
  });
  assert(result.status === 1, ...);
  assert((result.stderr || '').includes('sink-merge refused:'), ...);
}
```

Gitea Test 20 (`test-gitea-sinks.js`, lines 522–535):
Identical structure, no `--root` flag (Gitea uses `process.cwd()` auto-discovery).

### Dirty-worktree test approach
- Use `setupRealRepo` to get clean repo on `main` with feature branch
- Modify a tracked file on `main` without committing (so `git status --porcelain --untracked-files=no` returns non-empty)
- Run sink-merge subprocess with `KAOLA_WORKFLOW_OFFLINE: '1'` (fetch is skipped; clean-worktree check runs regardless)
- Assert `result.status === 1` and stderr includes `'Worktree must be clean'`
- GitLab test: pass `--root` flag; Gitea test: no `--root` flag
- New test in GitLab would be an unlabeled block; new Gitea test would be "Test 21"

## 7. Relevant Env Vars
| Env Var | Effect |
|---------|--------|
| `KAOLA_WORKFLOW_OFFLINE` | `=1` skips fetch/push/pull; clean-worktree check runs regardless (no OFFLINE gate on it) |
| `KAOLA_WORKFLOW_FORCE_FF_FAIL` | Integer; forces FF merge attempts to fail synthetically |
| `KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE` | Forces push classified as impossible; triggers exit-3 |
| `KAOLA_WORKFLOW_DEBUG_CWD` | Writes cwd to file on exit; used by success-path tests |

No env var bypasses the `assertCleanWorktree` check — it runs unconditionally where called.
