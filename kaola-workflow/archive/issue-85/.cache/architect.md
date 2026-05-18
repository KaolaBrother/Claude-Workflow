# Code Architect — Issue #85: E2E Regression Tests

## Files to Create

None.

## Files to Modify

| File | Changes | Why |
|------|---------|-----|
| `scripts/simulate-workflow-walkthrough.js` | Add 3 new test functions; add 3 calls in `main()` | Regression coverage |
| `CHANGELOG.md` | Append entry under `[Unreleased]` | User-visible change record |

## Build Sequence

1. Add `testE2EGitHubMergeFullChain` — merge path (startup → worktree-finalize → finalize --keep-worktree → assert archive in wtPath → sink-merge)
2. Add `testE2EGitHubPrFullChain` — PR path with production ordering (startup → worktree-finalize → sink-pr → watch-pr → assert archive)
3. Add `testParallelIssueIndependence` — two startups, 870 completes full merge chain, assert 871 untouched
4. Add three bare calls in `main()` after `testReadPriorityConfig()`, before final `console.log`
5. Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0

## Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | 1, 2, 3 | all three functions are independent; all written to same file but disjoint code sections |

All three functions + their `main()` calls are one task (single write set, single file).

## External Dependencies

None. All imports already at top of file (`fs`, `os`, `path`, `spawnSync`, `claimScript`, `sinkMergeScript`, `sinkPrScript`).

---

## Function Specifications

### `testE2EGitHubMergeFullChain` (issue number: 850)

```js
function testE2EGitHubMergeFullChain() {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kw-e2e-merge-')));
  const kwRoot = tmp + '.kw';
  try {
    initGitRepo(tmp);
    const binDir = path.join(tmp, 'bin');
    writeGhShimForStartup(binDir);

    // Step 1 — startup (online, gh shim)
    const s850 = runClaimOnline(['startup', '--runtime', 'claude', '--target-issue', '850'], tmp, binDir);
    assert(s850.claim === 'acquired', 'startup 850 should acquire, got: ' + JSON.stringify(s850));
    const wt850 = s850.worktree_path;
    assert(fs.existsSync(wt850), 'worktree dir must exist after startup');

    // Step 2 — feature commit on linked worktree branch
    fs.writeFileSync(path.join(wt850, 'feature-850.txt'), 'feature\n');
    spawnSync('git', ['add', 'feature-850.txt'], { cwd: wt850 });
    spawnSync('git', ['commit', '-m', 'feat: issue 850'], { cwd: wt850 });

    // Step 3 — worktree-finalize (cwd=tmp, reads worktree_path from main active folder)
    const wfResult = runClaimOnline(
      ['worktree-finalize', '--project', 'issue-850'], tmp, binDir
    );
    assert(wfResult.finalized === true, 'worktree-finalize should succeed');
    assert(
      fs.existsSync(path.join(wt850, 'kaola-workflow', 'issue-850', 'workflow-state.md')),
      'workflow-state.md must exist in linked worktree after worktree-finalize'
    );

    // Step 4 — finalize --keep-worktree (cwd=wt850)
    const finResult = spawnSync(process.execPath, [
      claimScript, 'finalize', '--project', 'issue-850', '--keep-worktree'
    ], { cwd: wt850, env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }, encoding: 'utf8' });
    assert(finResult.status === 0, 'finalize --keep-worktree should exit 0\nstderr: ' + finResult.stderr);
    // Archive is inside linked worktree (finalize ran from wt850)
    assert(
      fs.existsSync(path.join(wt850, 'kaola-workflow', 'archive', 'issue-850')),
      'archive must exist in linked worktree after finalize --keep-worktree'
    );
    // Main worktree copy cleaned up
    assert(
      !fs.existsSync(path.join(tmp, 'kaola-workflow', 'issue-850')),
      'main active folder must be removed after finalize from linked worktree'
    );
    // Linked worktree still exists (--keep-worktree)
    assert(fs.existsSync(wt850), 'linked worktree must survive --keep-worktree finalize');

    // Capture feature HEAD before sink-merge removes the worktree
    const featureHead = spawnSync('git', ['rev-parse', 'workflow/issue-850'],
      { cwd: tmp, encoding: 'utf8' }).stdout.trim();

    // Step 5 — sink-merge (cwd=wt850, OFFLINE)
    const smResult = spawnSync(process.execPath, [
      sinkMergeScript,
      '--project', 'issue-850',
      '--branch', 'workflow/issue-850',
      '--issue', '850'
    ], { cwd: wt850, env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }, encoding: 'utf8' });
    assert(smResult.status === 0,
      'sink-merge should exit 0\nstdout: ' + smResult.stdout + '\nstderr: ' + smResult.stderr);

    // main advanced to feature HEAD
    const mainAfter = spawnSync('git', ['rev-parse', 'main'],
      { cwd: tmp, encoding: 'utf8' }).stdout.trim();
    assert(mainAfter === featureHead,
      'main must advance to feature HEAD after sink-merge, got: ' + mainAfter);

    // feature branch deleted
    const branchList = spawnSync('git', ['branch', '--list', 'workflow/issue-850'],
      { cwd: tmp, encoding: 'utf8' }).stdout.trim();
    assert(branchList === '', 'workflow/issue-850 branch must be deleted after sink-merge');

    // linked worktree gone
    assert(!fs.existsSync(wt850), 'linked worktree must be removed by sink-merge');

    // main worktree clean
    const gitStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=no'],
      { cwd: tmp, encoding: 'utf8' }).stdout.trim();
    assert(gitStatus === '', 'main worktree must be clean after sink-merge, got: ' + gitStatus);

    console.log('testE2EGitHubMergeFullChain: PASSED');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    try { fs.rmSync(kwRoot, { recursive: true, force: true }); } catch (_) {}
  }
}
```

---

### `testE2EGitHubPrFullChain` (issue number: 860)

Key design decisions:
- Pass `KAOLA_SINK: 'pr'` as extraEnv to startup so workflow-state.md starts with `sink: pr` — avoids post-startup patching
- Custom gh shim handles both startup calls (`issue view`, `repo view`) and watch-pr calls (`pr view`)
- sink-pr OFFLINE updates only the LINKED worktree copy of workflow-state.md; must copy `pr_url` back to main worktree copy before watch-pr
- watch-pr runs via `runClaimOnline` (OFFLINE=0) — watch-pr exits immediately if OFFLINE=1
- Use `state: "MERGED"` in shim so watch-pr archives to `archive/issue-860` (no timestamp suffix)

```js
function testE2EGitHubPrFullChain() {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kw-e2e-pr-')));
  const kwRoot = tmp + '.kw';
  try {
    initGitRepo(tmp);
    const binDir = path.join(tmp, 'bin');
    // Custom shim: startup calls + watch-pr pr view
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, 'gh'), [
      '#!/bin/sh',
      'ARGS="$@"',
      'case "$ARGS" in',
      '  *"repo view"*) echo \'{"owner":{"login":"test"},"name":"repo"}\' ;;',
      '  *"issue view"*) echo \'{"number":860,"title":"pr-chain-fixture","body":"README.md","labels":[],"state":"open"}\' ;;',
      '  *"pr view"*) echo \'{"state":"MERGED","number":1}\' ;;',
      '  *"api"*) echo \'[]\' ;;',
      '  *) echo "" ;;',
      'esac',
      ''
    ].join('\n'));
    fs.chmodSync(path.join(binDir, 'gh'), 0o755);

    // Step 1 — startup with sink=pr
    const s860 = runClaimOnline(
      ['startup', '--runtime', 'claude', '--target-issue', '860'], tmp, binDir,
      { KAOLA_SINK: 'pr' }
    );
    assert(s860.claim === 'acquired', 'startup 860 should acquire, got: ' + JSON.stringify(s860));
    const wt860 = s860.worktree_path;
    assert(fs.existsSync(wt860), 'worktree dir must exist after startup');

    // Step 2 — worktree-finalize (cwd=tmp)
    const wfResult = runClaimOnline(
      ['worktree-finalize', '--project', 'issue-860'], tmp, binDir
    );
    assert(wfResult.finalized === true, 'worktree-finalize 860 should succeed');

    // Step 3 — plant phase6-summary.md in linked worktree (required by sink-pr appendSummary)
    const kwDir860 = path.join(wt860, 'kaola-workflow', 'issue-860');
    assert(fs.existsSync(kwDir860), 'linked worktree issue folder must exist after worktree-finalize');
    fs.writeFileSync(path.join(kwDir860, 'phase6-summary.md'), '# Phase 6 Summary\n');
    spawnSync('git', ['add', '-A'], { cwd: wt860 });
    const diff = spawnSync('git', ['-C', wt860, 'diff', '--cached', '--quiet'], { stdio: 'pipe' });
    if (diff.status !== 0) {
      spawnSync('git', ['commit', '-m', 'chore: pre-sink-pr state'], { cwd: wt860 });
    }

    // Step 4 — sink-pr (cwd=wt860, OFFLINE)
    const spResult = spawnSync(process.execPath, [
      sinkPrScript,
      '--branch', 'workflow/issue-860',
      '--project', 'issue-860',
      '--issue', '860'
    ], { cwd: wt860, env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }, encoding: 'utf8' });
    assert(spResult.status === 0,
      'sink-pr offline should exit 0\nstdout: ' + spResult.stdout + '\nstderr: ' + spResult.stderr);

    // workflow-state.md in linked worktree must contain pr_url
    const linkedState = fs.readFileSync(path.join(kwDir860, 'workflow-state.md'), 'utf8');
    assert(linkedState.includes('pr_url:'), 'linked worktree workflow-state.md must contain pr_url after sink-pr');

    // Linked worktree must be clean after sink-pr metadata commit
    const prStatus = spawnSync('git', ['-C', wt860, 'status', '--porcelain', '--untracked-files=no'],
      { stdio: 'pipe' });
    assert(prStatus.stdout.toString().trim() === '', 'linked worktree must be clean after sink-pr');

    // Copy pr_url back to main worktree state (watch-pr reads from main worktree only)
    const mainStateFile = path.join(tmp, 'kaola-workflow', 'issue-860', 'workflow-state.md');
    fs.writeFileSync(mainStateFile, linkedState);

    // Step 5 — watch-pr (cwd=tmp, ONLINE via runClaimOnline; gh shim returns MERGED)
    const wpResult = runClaimOnline(['watch-pr'], tmp, binDir);
    assert(wpResult.watched === 1, 'watch-pr should watch 1 PR-sink folder, got: ' + JSON.stringify(wpResult));

    // Active folder archived; no active folder remaining
    assert(
      fs.existsSync(path.join(tmp, 'kaola-workflow', 'archive', 'issue-860')),
      'archive/issue-860 must exist after watch-pr MERGED'
    );
    assert(
      !fs.existsSync(path.join(tmp, 'kaola-workflow', 'issue-860')),
      'active folder must be gone after watch-pr archives'
    );
    // Linked worktree removed by watch-pr
    assert(!fs.existsSync(wt860), 'linked worktree must be removed by watch-pr');

    console.log('testE2EGitHubPrFullChain: PASSED');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    try { fs.rmSync(kwRoot, { recursive: true, force: true }); } catch (_) {}
  }
}
```

---

### `testParallelIssueIndependence` (issues: 870, 871)

```js
function testParallelIssueIndependence() {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'kw-e2e-parallel-')));
  const kwRoot = tmp + '.kw';
  try {
    initGitRepo(tmp);
    const binDir = path.join(tmp, 'bin');
    writeGhShimForStartup(binDir);

    // Step 1 — startup both issues from main worktree
    const s870 = runClaimOnline(['startup', '--runtime', 'claude', '--target-issue', '870'], tmp, binDir);
    assert(s870.claim === 'acquired', 'startup 870 should acquire, got: ' + JSON.stringify(s870));
    const wt870 = s870.worktree_path;
    assert(fs.existsSync(wt870), 'wt870 must exist after startup');

    const s871 = runClaimOnline(['startup', '--runtime', 'claude', '--target-issue', '871'], tmp, binDir);
    assert(s871.claim === 'acquired', 'startup 871 should acquire, got: ' + JSON.stringify(s871));
    const wt871 = s871.worktree_path;
    assert(fs.existsSync(wt871), 'wt871 must exist after startup');
    assert(wt870 !== wt871, 'both worktrees must be distinct directories');

    // Step 2 — feature commit on 870 branch only
    fs.writeFileSync(path.join(wt870, 'feature-870.txt'), 'feature\n');
    spawnSync('git', ['add', 'feature-870.txt'], { cwd: wt870 });
    spawnSync('git', ['commit', '-m', 'feat: issue 870'], { cwd: wt870 });

    // Step 3 — worktree-finalize 870 (cwd=tmp)
    const wfResult = runClaimOnline(['worktree-finalize', '--project', 'issue-870'], tmp, binDir);
    assert(wfResult.finalized === true, 'worktree-finalize 870 should succeed');

    // Step 4 — finalize --keep-worktree 870 (cwd=wt870)
    const finResult = spawnSync(process.execPath, [
      claimScript, 'finalize', '--project', 'issue-870', '--keep-worktree'
    ], { cwd: wt870, env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }, encoding: 'utf8' });
    assert(finResult.status === 0,
      'finalize 870 --keep-worktree should exit 0\nstderr: ' + finResult.stderr);

    // Capture feature HEAD before sink-merge
    const feature870Head = spawnSync('git', ['rev-parse', 'workflow/issue-870'],
      { cwd: tmp, encoding: 'utf8' }).stdout.trim();

    // Step 5 — sink-merge 870 (cwd=wt870, OFFLINE)
    const smResult = spawnSync(process.execPath, [
      sinkMergeScript,
      '--project', 'issue-870',
      '--branch', 'workflow/issue-870',
      '--issue', '870'
    ], { cwd: wt870, env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }, encoding: 'utf8' });
    assert(smResult.status === 0,
      'sink-merge 870 should exit 0\nstdout: ' + smResult.stdout + '\nstderr: ' + smResult.stderr);

    // 870 closed: branch deleted, wt870 gone
    const branch870 = spawnSync('git', ['branch', '--list', 'workflow/issue-870'],
      { cwd: tmp, encoding: 'utf8' }).stdout.trim();
    assert(branch870 === '', 'workflow/issue-870 must be deleted after sink-merge');
    assert(!fs.existsSync(wt870), 'wt870 must be removed by sink-merge');

    // Step 6 — verify 871 is fully untouched
    assert(
      fs.existsSync(path.join(tmp, 'kaola-workflow', 'issue-871')),
      'issue-871 active folder must still exist after 870 completes'
    );
    assert(fs.existsSync(wt871), 'wt871 must still exist');
    const state871 = fs.readFileSync(
      path.join(tmp, 'kaola-workflow', 'issue-871', 'workflow-state.md'), 'utf8'
    );
    assert(state871.includes('status: active'), 'issue-871 state must still be active');
    const branch871 = spawnSync('git', ['branch', '--list', 'workflow/issue-871'],
      { cwd: tmp, encoding: 'utf8' }).stdout.trim();
    assert(branch871 !== '', 'workflow/issue-871 branch must still exist');

    console.log('testParallelIssueIndependence: PASSED');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    try { fs.rmSync(kwRoot, { recursive: true, force: true }); } catch (_) {}
  }
}
```

---

## Insertion in `main()`

After `testReadPriorityConfig()`, before `console.log('Workflow walkthrough simulation passed')`:

```js
    testReadPriorityConfig();
    testE2EGitHubMergeFullChain();
    testE2EGitHubPrFullChain();
    testParallelIssueIndependence();
    console.log('Workflow walkthrough simulation passed');
```

## Critical Implementation Notes

1. `worktree-finalize` runs from `tmp` (main worktree) — reads `worktree_path` from `tmp/kaola-workflow/issue-N/workflow-state.md`
2. `finalize --keep-worktree` runs from `wtN` (linked worktree) — this triggers `archiveProjectDir` that also cleans the main worktree copy
3. `sink-merge` runs from `wtN` (linked worktree, OFFLINE=1)
4. `sink-pr` runs from `wtN` (linked worktree, OFFLINE=1) — updates only the linked worktree copy; copy state back to main before watch-pr
5. `watch-pr` runs from `tmp` via `runClaimOnline` (OFFLINE=0) — if OFFLINE=1, it exits immediately without doing anything
6. `watch-pr` requires `folder.sink === 'pr' && folder.pr_url` in main worktree state — use `KAOLA_SINK: 'pr'` extraEnv at startup; copy updated state before watch-pr
7. Archive assertion for merge path: inside linked worktree (`wt850/kaola-workflow/archive/issue-850`); assert BEFORE sink-merge which removes the worktree
8. Archive assertion for PR path: in main worktree (`tmp/kaola-workflow/archive/issue-860`); `state: "MERGED"` = no timestamp suffix in archive path
9. `fs.realpathSync` on macOS: wrap `tmp` immediately after `mkdtempSync` so symlink `/tmp` → `/private/tmp` doesn't cause path comparison failures

## Validation Command

```bash
node scripts/simulate-workflow-walkthrough.js
```

Must exit 0 and print "Workflow walkthrough simulation passed".
