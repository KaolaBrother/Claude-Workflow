# Code Explorer Output — Issue #119

## 1. GitHub Offline Implementation (`scripts/kaola-workflow-sink-pr.js`)

**Env var check — line 7 (module load time):**
```js
const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';
```

**`ghExec` guard — lines 18-21:** All `gh` CLI calls run through `ghExec()`, which returns `''` immediately when `OFFLINE` is true. This prevents any forge API call.

**Early-return offline branch — lines 115-134 (inside `main()`):**
```js
if (OFFLINE) {
  const prUrl = 'OFFLINE_PLACEHOLDER';
  const prNumber = 0;
  updateStateSinkBlock(stateFile, prUrl, prNumber);
  appendSummary(summaryFile, prUrl, prNumber);
  // Metadata commit in OFFLINE mode (no push — no remote)
  const relState = path.relative(root, stateFile);
  const relSummary = path.relative(root, summaryFile);
  spawnSync('git', ['-C', root, 'add', relState, relSummary], { stdio: 'pipe' });
  const diffResult = spawnSync('git', ['-C', root, 'diff', '--cached', '--quiet'], { stdio: 'pipe' });
  if (diffResult.status !== 0) {
    const commitResult = spawnSync('git', ['-C', root, 'commit', '-m',
      'chore: record PR metadata for ' + args.project], { stdio: 'pipe' });
    if (commitResult.status !== 0) {
      process.stderr.write('[offline] metadata commit skipped: ...\n');
    }
  }
  return;  // <-- early-return before git push or any forge call
}
```

What this branch does:
- Skips `git push origin <branch>` entirely (line 137, never reached).
- Skips all `ghExec` calls (PR create, PR auto-merge).
- Records `prUrl = 'OFFLINE_PLACEHOLDER'`, `prNumber = 0` into `workflow-state.md`'s `## Sink` block and appends to `phase6-summary.md`.
- Still attempts a local `git add` + `git commit` of those two metadata files (no-op if no diff; errors are soft-logged to stderr and not fatal).
- Returns without error.

---

## 2. Gitea Sink Current State (`plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`)

**No `OFFLINE` constant or check anywhere in this file.** The file does not reference `process.env` at all.

**Push — line 110 inside `ensurePullRequest(args, opts)`:**
```js
if (!options.skipPush) gitExec('git', ['push', 'origin', args.branch], { encoding: 'utf8' });
```
`skipPush` is a test-injection option (boolean). There is no `OFFLINE` guard here.

**PR creation — lines 114-121:**
```js
const existing = findPullRequestForBranch(args.branch);
const pr = existing || forge.createPullRequest({
  sourceBranch: args.branch,
  targetBranch: 'main',
  title: args.title || ('Workflow branch ' + args.branch),
  description: args.description || (args.issue ? 'Closes #' + args.issue : '')
});
assert(pr && pr.pr_number, 'Gitea PR creation did not return a number');
assert(pr.pr_url || pr.web_url, 'Gitea PR creation did not return a URL');
```

`findPullRequestForBranch` calls `forge.listPullRequests()` → `teaExec(...)` → returns `''` when `OFFLINE=1`, parsed as `[]`. `forge.createPullRequest()` → `teaExec(...)` → returns `''` → `normalizePullRequest({})` → `{ pr_number: null, pr_url: '' }`. **The `assert(pr && pr.pr_number, ...)` then throws**, crashing the process with exit code 1.

**`skipPush` injection (test-only, in-process):** Used directly in `opts.skipPush`. Also activates `skipMetadataCommit` (lines 96-98). This is for unit tests with `withForge` stubs — not suitable for the offline scenario.

**`discoverProject` call — line 112:** Called unconditionally after push; in offline mode `teaExec` returns `''` which normalizes to `{ owner: '', name: '', full_name: '', html_url: '' }`, but there is a `git remote get-url origin` fallback in `kaola-gitea-forge.js` at line 104 that runs even when `OFFLINE=1` (not guarded by `OFFLINE` in `discoverProject`).

---

## 3. GitLab Sink Current State (`plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`)

**No `OFFLINE` constant or check anywhere in this file.** No `process.env` references.

**Push — line 107 inside `ensureMergeRequest(args, opts)`:**
```js
if (!options.skipPush) gitExec('git', ['push', 'origin', args.branch], { encoding: 'utf8' });
```
Same `skipPush` test-injection pattern. No `OFFLINE` guard.

**MR creation — lines 109-115:**
```js
const existing = findMergeRequestForBranch(args.branch);
const mr = existing || forge.createMergeRequest({
  sourceBranch: args.branch,
  targetBranch: 'main',
  title: args.title || ('Workflow branch ' + args.branch),
  description: args.description || (args.issue ? 'Closes #' + args.issue : '')
});
assert(mr && mr.mr_iid, 'GitLab MR creation did not return an IID');
assert(mr.mr_url || mr.web_url, 'GitLab MR creation did not return a URL');
```
Same failure chain: `glabExec` returns `''` → `normalizeMergeRequest({})` → `{ mr_iid: null }` → assert throws.

**No `discoverProject` call** in the GitLab sink (only in Gitea sink).

---

## 4. Other `KAOLA_WORKFLOW_OFFLINE` Checks in the Codebase

Files that read the env var at module load time:
- `scripts/kaola-workflow-sink-pr.js` — line 7
- `scripts/kaola-workflow-sink-merge.js` — line 8
- `scripts/kaola-workflow-claim.js` — line 15
- `scripts/kaola-workflow-classifier.js` — line 9
- `scripts/kaola-workflow-active-folders.js` — line 8
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js` — line 6 (guards `teaExec`)
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` — line 13
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-claim.js` — line 18
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-classifier.js` — line 10
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js` — line 6 (guards `glabExec`)
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` — line 13
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` — line 18 (implicit, via forge)
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-classifier.js` — line 10

**Critical implication:** `OFFLINE` is evaluated at module load time, so in-process tests cannot flip the flag. All tests for the offline path must use `spawnSync` with `{ env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' } }`.

---

## 5. Naming and File Organization Conventions

| Aspect | GitHub core | Gitea plugin | GitLab plugin |
|---|---|---|---|
| Sink file | `scripts/kaola-workflow-sink-pr.js` | `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js` | `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` |
| Merge sink | `scripts/kaola-workflow-sink-merge.js` | `kaola-gitea-workflow-sink-merge.js` | `kaola-gitlab-workflow-sink-merge.js` |
| Forge adapter | (uses `gh` CLI directly) | `kaola-gitea-forge.js` (wraps `tea` CLI) | `kaola-gitlab-forge.js` (wraps `glab` CLI) |
| Exported function | (no export — CLI only) | `ensurePullRequest(args, opts)` | `ensureMergeRequest(args, opts)` |
| Test file | `scripts/simulate-workflow-walkthrough.js` | `test-gitea-sinks.js` | `test-gitlab-sinks.js` |
| State field names | `pr_url`, `pr_number` | `pr_url`, `pr_number`, `full_name`, `project_html_url` | `mr_url`, `mr_iid` |
| Summary file labels | `PR URL:`, `PR number:` | `PR URL:`, `PR Number:` | `MR URL:`, `MR IID:` |
| `'use strict'` | absent | present | present |
| Exports | none (CLI only) | `appendSummary`, `ensurePullRequest`, `findPullRequestForBranch`, `mergePullRequest`, `routePullRequestState`, `updateStateSinkBlock` | `appendSummary`, `ensureMergeRequest`, `findMergeRequestForBranch`, `mergeMergeRequest`, `routeMergeRequestState`, `updateStateSinkBlock` |

---

## 6. Error Handling Patterns

**Push failure:** `execFileSync('git', ['push', ...])` throws synchronously on non-zero exit; not caught, propagates to outer try/catch wrapper → stderr + exit code 1.

**Forge API failure:** `assert()` helper throws `Error` with descriptive message; caught by outer try/catch → stderr + exit code 1.

**Metadata commit failure (offline path, GitHub only):** Soft-logged: `process.stderr.write('[offline] metadata commit skipped: ...\n')` — not fatal, does not set exitCode.

**Return values:**
- GitHub: no return value (CLI only).
- Gitea `ensurePullRequest`: returns `{ pr, project }`.
- GitLab `ensureMergeRequest`: returns `mr` object directly.

---

## 7. Test Locations, Framework, and Structure

**Framework:** Hand-rolled assertions using Node's built-in `assert` module. No test runner. Scripts exit non-zero on uncaught assertion errors.

**Gitea sink tests:**
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`
- In-process tests (Tests 1-14): use `withForge(stubs, fn)` + `skipPush: true` injection
- Subprocess tests (Tests 15-18): `spawnSync` with `KAOLA_WORKFLOW_OFFLINE: '1'` — cover `sink-merge.js`, NOT `sink-pr.js`
- **No existing subprocess test for the PR sink's offline path**

**GitLab sink tests:**
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Same two-tier structure
- Subprocess tests (blocks 2-5) cover `sink-merge.js` with `KAOLA_WORKFLOW_OFFLINE: '1'`
- **No existing subprocess test for the MR sink's offline path**

**New offline tests must use subprocess pattern** (`setupRealRepo` + `spawnSync` + `KAOLA_WORKFLOW_OFFLINE: '1'`) because `OFFLINE` is a module-load-time constant.

---

## 8. Relevant Config and Env Vars

| Env var | GitHub sink | Gitea sink | GitLab sink |
|---|---|---|---|
| `KAOLA_WORKFLOW_OFFLINE` | Line 7 — checked directly | Not checked in sink; forge checks it in `teaExec` | Not checked in sink; forge checks it in `glabExec` |
| `KAOLA_WORKFLOW_OFFLINE` (forge) | N/A | `teaExec` short-circuits on `=== '1'` | `glabExec` short-circuits on `=== '1'` |

**Key files for implementation:**
- `scripts/kaola-workflow-sink-pr.js` (reference — lines 7, 115-134)
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js` (target — `ensurePullRequest`, lines 93-158)
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` (target — `ensureMergeRequest`, lines 90-153)
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` (tests — subprocess pattern at lines 376-444)
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` (tests — subprocess pattern at lines 406-479)
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-forge.js` (forge — `teaExec` offline guard lines 15-16; `discoverProject` fallback lines 96-111)
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-forge.js` (forge — `glabExec` offline guard lines 13-14)

**Critical placement note:** The offline early-return in `ensurePullRequest` must occur BEFORE the `forge.discoverProject()` call at line 112 (Gitea only), as that call has a fallback to `git remote get-url origin` that runs even when `teaExec` returns `''`.
