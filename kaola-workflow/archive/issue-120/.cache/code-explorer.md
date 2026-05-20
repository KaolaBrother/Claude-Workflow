# Code-Explorer Output — issue-120

## GitHub Guard Source (reference)

`scripts/kaola-workflow-sink-merge.js` lines 71-90:
```js
function assertNoLiveWorkflowFolder(mainRoot, project) {
  const gitPath = 'kaola-workflow/' + project + '/workflow-state.md';
  let committed = false;
  try {
    execFileSync('git', ['-C', mainRoot, 'cat-file', '-e', 'HEAD:' + gitPath],
      { encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] });
    committed = true;
  } catch (_) {
    committed = false;
  }
  if (committed) {
    throw new Error(
      'sink-merge refused: kaola-workflow/' + project + '/workflow-state.md still exists on branch HEAD.\n' +
      'Run finalize before sink-merge, then recommit. Two remediation paths:\n' +
      '  Path A (worktree available): cd <worktree> && node <claim.js> finalize --project ' + project + ' --keep-worktree\n' +
      '    then git add kaola-workflow/ && git commit -m "chore: archive ' + project + '" on the feature branch\n' +
      '  Path B (worktree gone): git rm -r kaola-workflow/' + project + '/ on the feature branch, commit, then re-run sink-merge'
    );
  }
}
```

Enforced at lines 263-265:
```js
assertCleanWorktree(mainRoot);
execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });
assertNoLiveWorkflowFolder(mainRoot, args.project);
```

## Insertion Points

**Gitea** (`plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js`):
- Line 279: `execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });`
- Insert `assertNoLiveWorkflowFolder(mainRoot, args.project);` immediately after line 279
- Add function definition after existing `assertCleanWorktree` (line 78), before `fastForwardMain`

**GitLab** (`plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`):
- Line 280: `execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], { encoding: 'utf8' });`
- Same pattern: insert guard call after checkout
- Add function definition in same position

## Test Patterns

Both test files use `setupRealRepo` which writes the live folder to filesystem on main but does NOT commit it. To test the guard, need a helper that commits the live folder to the feature branch:

```js
function setupRepoWithLiveFolderOnBranch(name, project) {
  const { root, branch } = setupRealRepo(name, project);
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('checkout', branch);
  const dir = path.join(root, 'kaola-workflow', project);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'workflow-state.md'), '# Kaola-Workflow State\nstatus: active\n');
  git('add', 'kaola-workflow/');
  git('commit', '-m', 'accidentally committed live folder');
  git('checkout', 'main');
  return { root, branch };
}
```

Test: subprocess with `KAOLA_WORKFLOW_OFFLINE=1`, assert exit 1, stderr includes 'sink-merge refused' and 'workflow-state.md still exists on branch HEAD'.

Test numbering:
- Gitea: Test 20 (after Test 19 added in issue #119)
- GitLab: unnamed block after offline-MR block

## Exit Code
Exit code 1 — guard throws Error, caught by main()'s try/catch.
