# Code Architect Blueprint — Issue #119

## Pre-Edit Verification Results

**V1 — Gitea `updateStateSinkBlock` arity:**
Confirmed 5-arg: `function updateStateSinkBlock(stateFile, prUrl, prNumber, fullName, projectHtmlUrl)` (line 58). All five must be supplied in the offline block.

**V2 — `appendSummary` creates-if-missing:**
Both plugins guard on whether the *parent directory* exists, not the file itself:
- Gitea (line 73-77): `if (!fs.existsSync(path.dirname(summaryFile))) return false;` then `fs.appendFileSync` which creates the file when the dir exists.
- GitLab (line 70-74): identical pattern.
So `appendSummary` creates the file if the directory exists, returns false if dir is absent. Tolerate `false` return silently.

**V3 — GitLab `ensureMergeRequest` return shape:**
Line 152: `return mr;` — raw `mr` object. `main()` (lines 167-169) reads: `mr.mr_iid`, `mr.mr_url || mr.web_url`. Offline return `{ mr_url: 'OFFLINE_PLACEHOLDER', mr_iid: 0 }` is sufficient.

Contrast: Gitea (line 157): `return { pr, project };` — `main()` destructures `{ pr, project }`. Offline return must be `{ pr: { pr_url, pr_number }, project: { full_name, html_url, owner, name } }`.

---

## Design Decisions

- OFFLINE constant at module top, after requires — matches `scripts/kaola-workflow-sink-pr.js:7` and forge files.
- Early-return inside `ensurePullRequest`/`ensureMergeRequest`, after asserts and `const root = ...`, BEFORE push and `forge.discoverProject()` (Gitea). Asserts still run in offline mode.
- Placeholders: `pr_url`/`mr_url` = `'OFFLINE_PLACEHOLDER'`, `pr_number`/`mr_iid` = `0`, Gitea-only `full_name`/`project_html_url` = `'OFFLINE_PLACEHOLDER'`.
- Metadata commit soft-failure on error: `process.stderr.write('[offline] metadata commit skipped: ...')` — not fatal, no throw.
- `--merge` gate: `if (args.merge && !OFFLINE)` in both `main()` functions.
- GitLab return: `{ mr_url: 'OFFLINE_PLACEHOLDER', mr_iid: 0 }` — matches `main()`'s field reads.
- Gitea return: `{ pr: { pr_url: 'OFFLINE_PLACEHOLDER', pr_number: 0 }, project: { full_name: 'OFFLINE_PLACEHOLDER', html_url: 'OFFLINE_PLACEHOLDER', owner: 'OFFLINE', name: 'PLACEHOLDER' } }` — matches `main()`'s destructure.

---

## Files to Modify

| File (worktree-relative) | Changes |
|---|---|
| `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js` | Add OFFLINE constant; add offline early-return in `ensurePullRequest`; gate --merge in `main()` |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` | Add OFFLINE constant; add offline early-return in `ensureMergeRequest`; gate --merge in `main()` |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` | Append offline subprocess test (Test 19) |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Append offline subprocess test |

Files to create: none. Files to delete: none.

---

## Build Sequence

1. Edit Gitea sink — add OFFLINE constant (no deps)
2. Edit Gitea sink — add offline early-return + gate --merge (depends on constant)
3. Edit GitLab sink — add OFFLINE constant (no deps, parallel with 1-2)
4. Edit GitLab sink — add offline early-return + gate --merge (depends on constant)
5. Append Gitea offline subprocess test (depends on Tasks 1-2)
6. Append GitLab offline subprocess test (depends on Tasks 3-4)
7. Validate both test suites

---

## Task List

### Task 1 — Gitea sink OFFLINE constant
File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`

After the require block (after line ~8), insert:
```js
const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';
```

### Task 2 — Gitea sink offline early-return + --merge gate
File: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js`

Inside `ensurePullRequest`, after `const root = options.root || getRoot();` and BEFORE `const gitExec = options.gitExec || execFileSync;` and push, insert:

```js
  if (OFFLINE) {
    const prUrl = 'OFFLINE_PLACEHOLDER';
    const prNumber = 0;
    const project = {
      full_name: 'OFFLINE_PLACEHOLDER',
      html_url: 'OFFLINE_PLACEHOLDER',
      owner: 'OFFLINE',
      name: 'PLACEHOLDER'
    };
    const stateFile = path.join(root, 'kaola-workflow', args.project, 'workflow-state.md');
    const summaryFile = path.join(root, 'kaola-workflow', args.project, 'phase6-summary.md');
    updateStateSinkBlock(stateFile, prUrl, prNumber, project.full_name, project.html_url);
    appendSummary(summaryFile, prUrl, prNumber);
    const relState = path.relative(root, stateFile);
    const relSummary = path.relative(root, summaryFile);
    spawnSync('git', ['-C', root, 'add', relState, relSummary], { stdio: 'pipe' });
    const diffResult = spawnSync('git', ['-C', root, 'diff', '--cached', '--quiet'], { stdio: 'pipe' });
    if (diffResult.status !== 0) {
      const commitResult = spawnSync('git', ['-C', root, 'commit', '-m',
        'chore: record PR metadata for ' + args.project], { stdio: 'pipe' });
      if (commitResult.status !== 0) {
        process.stderr.write('[offline] metadata commit skipped: ' +
          (commitResult.stderr ? commitResult.stderr.toString().trim() : 'unknown error') + '\n');
      }
    }
    return { pr: { pr_url: prUrl, pr_number: prNumber }, project };
  }
```

In `main()`: change `if (args.merge)` to `if (args.merge && !OFFLINE)`.

### Task 3 — GitLab sink OFFLINE constant
File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`

After the require block (~line 8), insert:
```js
const OFFLINE = process.env.KAOLA_WORKFLOW_OFFLINE === '1';
```

### Task 4 — GitLab sink offline early-return + --merge gate
File: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`

Inside `ensureMergeRequest`, after `const root = options.root || getRoot();` and BEFORE `const gitExec = ...` and push, insert:

```js
  if (OFFLINE) {
    const mrUrl = 'OFFLINE_PLACEHOLDER';
    const mrIid = 0;
    const stateFile = path.join(root, 'kaola-workflow', args.project, 'workflow-state.md');
    const summaryFile = path.join(root, 'kaola-workflow', args.project, 'phase6-summary.md');
    updateStateSinkBlock(stateFile, mrUrl, mrIid);
    appendSummary(summaryFile, mrUrl, mrIid);
    const relState = path.relative(root, stateFile);
    const relSummary = path.relative(root, summaryFile);
    spawnSync('git', ['-C', root, 'add', relState, relSummary], { stdio: 'pipe' });
    const diffResult = spawnSync('git', ['-C', root, 'diff', '--cached', '--quiet'], { stdio: 'pipe' });
    if (diffResult.status !== 0) {
      const commitResult = spawnSync('git', ['-C', root, 'commit', '-m',
        'chore: record MR metadata for ' + args.project], { stdio: 'pipe' });
      if (commitResult.status !== 0) {
        process.stderr.write('[offline] metadata commit skipped: ' +
          (commitResult.stderr ? commitResult.stderr.toString().trim() : 'unknown error') + '\n');
      }
    }
    return { mr_url: mrUrl, mr_iid: mrIid };
  }
```

In `main()`: change `if (args.merge)` to `if (args.merge && !OFFLINE)`.

### Task 5 — Gitea offline subprocess test
File: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`

Append after the final `console.log('Gitea sink tests passed');` line:

```js
// Test 19: OFFLINE=1 — sink-pr records placeholder, commits locally, no forge calls
{
  const sinkPrScript = path.join(__dirname, 'kaola-gitea-workflow-sink-pr.js');
  const { root, branch } = setupRealRepo('offline-gt-pr-test', 'test-gt-offline-pr');

  const branchBefore = execFileSync('git', ['branch', '--list', branch], { cwd: root, encoding: 'utf8' });
  assert(branchBefore.trim() !== '', `offline-pr test: branch '${branch}' must exist before test`);

  const result = spawnSync(process.execPath, [
    sinkPrScript,
    '--branch', branch,
    '--project', 'test-gt-offline-pr',
    '--issue', '119'
  ], {
    cwd: root,
    env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' },
    encoding: 'utf8'
  });

  assert(result.status === 0,
    `offline-pr test: expected exit 0, got ${result.status}. stderr: ${result.stderr}`);
  assert((result.stdout || '').includes('PR URL: OFFLINE_PLACEHOLDER'),
    `offline-pr test: stdout must include 'PR URL: OFFLINE_PLACEHOLDER'. got: ${result.stdout}`);
  assert((result.stdout || '').includes('PR Number: 0'),
    `offline-pr test: stdout must include 'PR Number: 0'. got: ${result.stdout}`);

  const stateFile = path.join(root, 'kaola-workflow', 'test-gt-offline-pr', 'workflow-state.md');
  const state = fs.readFileSync(stateFile, 'utf8');
  assert(state.includes('pr_url: OFFLINE_PLACEHOLDER'), `offline-pr test: state must include 'pr_url: OFFLINE_PLACEHOLDER'`);
  assert(state.includes('pr_number: 0'), `offline-pr test: state must include 'pr_number: 0'`);
  assert(state.includes('full_name: OFFLINE_PLACEHOLDER'), `offline-pr test: state must include 'full_name: OFFLINE_PLACEHOLDER'`);
  assert(state.includes('project_html_url: OFFLINE_PLACEHOLDER'), `offline-pr test: state must include 'project_html_url: OFFLINE_PLACEHOLDER'`);

  const summaryFile = path.join(root, 'kaola-workflow', 'test-gt-offline-pr', 'phase6-summary.md');
  const summary = fs.readFileSync(summaryFile, 'utf8');
  assert(summary.includes('PR URL: OFFLINE_PLACEHOLDER'), `offline-pr test: summary must include 'PR URL: OFFLINE_PLACEHOLDER'`);
  assert(summary.includes('PR Number: 0'), `offline-pr test: summary must include 'PR Number: 0'`);

  const log = execFileSync('git', ['log', '--oneline', '-1'], { cwd: root, encoding: 'utf8' }).trim();
  assert(log.includes('chore: record PR metadata for test-gt-offline-pr'),
    `offline-pr test: expected metadata commit in git log, got: ${log}`);

  console.log('offline-pr subprocess test passed');
}
```

### Task 6 — GitLab offline subprocess test
File: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

Append after the final `console.log('GitLab sink tests passed');` line:

```js
{
  // Offline MR sink: KAOLA_WORKFLOW_OFFLINE=1 records placeholder, commits locally, no forge calls
  const sinkMrScript = path.join(__dirname, 'kaola-gitlab-workflow-sink-mr.js');
  const { root, branch } = setupRealRepo('offline-gl-mr-test', 'test-gl-offline-mr');

  const branchBefore = execFileSync('git', ['branch', '--list', branch], { cwd: root, encoding: 'utf8' });
  assert(branchBefore.trim() !== '', `offline-mr test: branch '${branch}' must exist before test`);

  const result = spawnSync(process.execPath, [
    sinkMrScript,
    '--branch', branch,
    '--project', 'test-gl-offline-mr',
    '--issue', '119'
  ], {
    cwd: root,
    env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' },
    encoding: 'utf8'
  });

  assert(result.status === 0,
    `offline-mr test: expected exit 0, got ${result.status}. stderr: ${result.stderr}`);
  assert((result.stdout || '').includes('MR URL: OFFLINE_PLACEHOLDER'),
    `offline-mr test: stdout must include 'MR URL: OFFLINE_PLACEHOLDER'. got: ${result.stdout}`);
  assert((result.stdout || '').includes('MR IID: 0'),
    `offline-mr test: stdout must include 'MR IID: 0'. got: ${result.stdout}`);

  const stateFile = path.join(root, 'kaola-workflow', 'test-gl-offline-mr', 'workflow-state.md');
  const state = fs.readFileSync(stateFile, 'utf8');
  assert(state.includes('mr_url: OFFLINE_PLACEHOLDER'), `offline-mr test: state must include 'mr_url: OFFLINE_PLACEHOLDER'`);
  assert(state.includes('mr_iid: 0'), `offline-mr test: state must include 'mr_iid: 0'`);

  const summaryFile = path.join(root, 'kaola-workflow', 'test-gl-offline-mr', 'phase6-summary.md');
  const summary = fs.readFileSync(summaryFile, 'utf8');
  assert(summary.includes('MR URL: OFFLINE_PLACEHOLDER'), `offline-mr test: summary must include 'MR URL: OFFLINE_PLACEHOLDER'`);
  assert(summary.includes('MR IID: 0'), `offline-mr test: summary must include 'MR IID: 0'`);

  const log = execFileSync('git', ['log', '--oneline', '-1'], { cwd: root, encoding: 'utf8' }).trim();
  assert(log.includes('chore: record MR metadata for test-gl-offline-mr'),
    `offline-mr test: expected metadata commit in git log, got: ${log}`);

  console.log('offline-mr subprocess test passed');
}
```

---

## Validation Commands

Run from worktree root `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-119`:

```bash
node --check plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-pr.js
node --check plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js
node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js
node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js
node scripts/simulate-workflow-walkthrough.js
npm test
```

---

## Out-of-Scope

- `kaola-workflow-sink-merge` scripts (Gitea and GitLab) — already gate-tested with OFFLINE in existing tests
- `scripts/kaola-workflow-sink-pr.js` (GitHub) — already implements OFFLINE
- `kaola-gitea-forge.js`, `kaola-gitlab-forge.js` — no forge-layer changes
- `docs/`, `CHANGELOG.md` — handled by Phase 6
- `scripts/simulate-workflow-walkthrough.js` — no changes required

---

## Test Infrastructure Notes

`setupRealRepo` creates a temp dir, inits a git repo on `main`, checks out a feature branch with a commit, then returns to `main`. It calls `writeWorkflow` which writes `workflow-state.md` (with a `## Sink` block) and `phase6-summary.md` as untracked files on `main`. When the offline sink runs, it `git add`s and commits these on `main`. `git log --oneline -1` from `root` shows the metadata commit on `main`.

Both tests verify no forge calls were made: the test repo has no remote — a leaked `git push` would cause non-zero exit, so exit 0 proves the push was skipped.
