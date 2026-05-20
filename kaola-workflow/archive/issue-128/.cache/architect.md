# Code Architect Output — Issue #128

## Verified Line Numbers (from worktree at /Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-128)

### GitLab insertion point
- Line 298: `if (!OFFLINE) {`
- Line 299: `  execFileSync('git', ['-C', mainRoot, 'fetch', 'origin'], { encoding: 'utf8' });`
- Line 300: `}` ← end of fetch block
- Line 301: (blank)
- Line 302: `// Checkout branch`
- Line 303: `execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });`
- Insert AFTER line 300 (after closing `}` of fetch block), BEFORE line 302 (`// Checkout branch`)
- `mainRoot` in scope from line 268

### Gitea insertion point
- Line 297: `if (!OFFLINE) {`
- Line 298: `  execFileSync('git', ['-C', mainRoot, 'fetch', 'origin'], { encoding: 'utf8' });`
- Line 299: `}` ← end of fetch block
- Line 300: (blank)
- Line 301: `// Checkout branch`
- Line 302: `execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });`
- Insert AFTER line 299 (after closing `}` of fetch block), BEFORE line 301 (`// Checkout branch`)
- `mainRoot` in scope from line 268 (identical structure)

## Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` | Insert 2-line inline guard after line 300, before `// Checkout branch` | Add clean-worktree check to real pipeline, matching GitHub |
| `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` | Insert 2-line inline guard after line 299, before `// Checkout branch` | Same as GitLab |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Add dirty-worktree subprocess test block after line 568 (after `}` of live-folder guard test) | Prove guard triggers on dirty tracked file |
| `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` | Add "Test 21" dirty-worktree subprocess test block after line 535 (after `}` of Test 20) | Same as GitLab; no `--root` flag |
| `CHANGELOG.md` | Add entry under [Unreleased] | Document user-visible change |

## Files to Create
None.

## Inline Guard Code (both files identical)
```js
  const _cwStatus = execFileSync('git', ['-C', mainRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert(!_cwStatus, 'Worktree must be clean before direct merge sink runs');
```
(Uses `_cwStatus` to avoid shadowing any outer `status` variable. Uses existing helper message string for consistency with GitLab/Gitea.)

## Dirty-Worktree Test (GitLab — with --root flag)
```js
// assertCleanWorktree guard — exits 1 with 'Worktree must be clean'
{
  const sinkScript = path.join(__dirname, 'kaola-gitlab-workflow-sink-merge.js');
  const { root, branch } = setupRealRepo('dirty-worktree-gl-test', 'test-gl-dirty');
  fs.writeFileSync(path.join(root, 'README.md'), 'dirty content');
  const result = spawnSync(process.execPath, [sinkScript, '--project', 'test-gl-dirty', '--branch', branch, '--root', root], {
    cwd: root,
    env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' },
    encoding: 'utf8'
  });
  assert(result.status === 1, `dirty-worktree guard test: expected exit 1, got ${result.status}. stderr: ${result.stderr}`);
  assert((result.stderr || '').includes('Worktree must be clean'),
    `dirty-worktree guard test: expected 'Worktree must be clean' in stderr, got: ${result.stderr}`);
  console.log('dirty-worktree guard subprocess test passed');
}
```

## Dirty-Worktree Test (Gitea — no --root flag, labeled Test 21)
```js
// Test 21: assertCleanWorktree guard — exits 1 with 'Worktree must be clean'
{
  const sinkScript = path.join(__dirname, 'kaola-gitea-workflow-sink-merge.js');
  const { root, branch } = setupRealRepo('dirty-worktree-gt-test', 'test-gt-dirty');
  fs.writeFileSync(path.join(root, 'README.md'), 'dirty content');
  const result = spawnSync(process.execPath, [sinkScript, '--project', 'test-gt-dirty', '--branch', branch], {
    cwd: root,
    env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' },
    encoding: 'utf8'
  });
  assert(result.status === 1, `dirty-worktree guard test: expected exit 1, got ${result.status}. stderr: ${result.stderr}`);
  assert((result.stderr || '').includes('Worktree must be clean'),
    `dirty-worktree guard test: expected 'Worktree must be clean' in stderr, got: ${result.stderr}`);
  console.log('dirty-worktree guard subprocess test passed');
}
```

## Build Sequence
1. Task A: GitLab guard + test (write set: kaola-gitlab-workflow-sink-merge.js + test-gitlab-sinks.js)
2. Task B: Gitea guard + test (write set: kaola-gitea-workflow-sink-merge.js + test-gitea-sinks.js)
3. Task C: CHANGELOG (write set: CHANGELOG.md)
Tasks A, B, C are fully disjoint — can run in parallel.

## Validation Command
- Task A: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- Task B: `node plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js`
- Task C: N/A (visual review)
- Final: `npm test` (runs all test suites)

## Out of Scope
- No edits to GitHub's `scripts/kaola-workflow-sink-merge.js`
- No edits to Codex mirror `plugins/kaola-workflow/scripts/`
- No refactor of existing `assertCleanWorktree(gitExec)` helper
- No changes to `fastForwardMain`
- No OFFLINE gate on the new guard
- No `assertNoLiveWorkflowFolder` position change
