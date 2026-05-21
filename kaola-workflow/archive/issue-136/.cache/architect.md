# Code Architect Output — Issue #136

## Critical Design Decision
Cannot call cmdGenerate() inside archiveProjectDir — it writes to stdout and breaks the
JSON contract that test suite's json() helper depends on. Must export a silent
`regenerateRoadmap(root)` that returns 'generated'|'up-to-date' without writing stdout.

## Files to Create
None. All changes are modifications to existing files.

## Files to Modify
| File | Changes |
|------|---------|
| scripts/kaola-workflow-roadmap.js | (a) Extract regenerateRoadmap(root); refactor cmdGenerate wrapper. (b) Add validateRemote()+cmdValidateRemote(). (c) Wire validate-remote in main(). (d) Add module.exports |
| scripts/kaola-workflow-claim.js | (a) require roadmap module. (b) In archiveProjectDir: closed-gate roadmap cleanup |
| scripts/simulate-workflow-walkthrough.js | Add testFinalizeCleansRoadmapEntry() + testFinalizeFromLinkedWorktreeCleansRoadmapEntry() |
| kaola-workflow/.roadmap/issue-133.md | DELETE (live drift data fix) |
| kaola-workflow/ROADMAP.md | Regenerate after deletion |
| CHANGELOG.md | Add [Unreleased] entry |

## Build Sequence
1. kaola-workflow-roadmap.js — add exports (no upstream deps)
2. kaola-workflow-claim.js — import and use regenerateRoadmap (depends on step 1)
3. simulate-workflow-walkthrough.js — add tests (depends on steps 1+2)
4. Verify: node scripts/simulate-workflow-walkthrough.js exits 0
5. Data fix: rm issue-133.md + node roadmap.js generate
6. Docs: CHANGELOG entry

## Parallelization
- Group A (serial): T1 → T2 (hard dependency)
- Group B (parallel after A): T3 (tests) + T5 (CHANGELOG) have disjoint write sets
- T4 (data fix): last, after verification

## kaola-workflow-roadmap.js Implementation

### (a) regenerateRoadmap + refactored cmdGenerate
```js
function regenerateRoadmap(root) {
  const repoRoot = root || getRoot();
  const dir = roadmapDir(repoRoot);
  const outFile = roadmapFile(repoRoot);
  guardAgainstMissingRoadmapSource(dir, outFile);
  const issues = readRoadmapIssues(dir);
  const content = buildRoadmapContent(issues);
  const wrote = writeFileAtomicReplace(outFile, content);
  return wrote ? 'generated' : 'up-to-date';
}

function cmdGenerate() {
  process.stdout.write(regenerateRoadmap(getRoot()) + '\n');
}
```

### (b) validateRemote + cmdValidateRemote
```js
const { issueIsClosed } = require('./kaola-workflow-active-folders');

function validateRemote(root) {
  const repoRoot = root || getRoot();
  const dir = roadmapDir(repoRoot);
  const issues = readRoadmapIssues(dir);
  const drift = [];
  for (const it of issues) {
    if (String(it.status || '').toLowerCase() !== 'open') continue;
    const n = parseInt(String(it.issue).replace('#', ''), 10);
    if (!Number.isInteger(n) || n <= 0) continue;
    if (issueIsClosed(n)) drift.push(n);
  }
  return drift;
}

function cmdValidateRemote() {
  if (process.env.KAOLA_WORKFLOW_OFFLINE === '1') {
    process.stdout.write('skipped: offline\n');  // NOT silent
    return;
  }
  const drift = validateRemote(getRoot());
  if (drift.length > 0) {
    process.stderr.write(
      'roadmap drift: ' + drift.map(n => 'issue-' + n + '.md').join(', ') +
      ' marked open but closed on remote; run finalize or remove stale .roadmap files\n'
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write('ok\n');
}
```
OFFLINE note: Must be explicit check in cmdValidateRemote, NOT relying on issueIsClosed() returning false (which would silently pass).

### (c) Wire in main() after validate, before unknown-sub handler
```js
if (sub === 'validate-remote') { cmdValidateRemote(); return; }
```

### (d) module.exports (before require.main guard at line 303)
```js
module.exports = {
  cmdGenerate,
  regenerateRoadmap,
  validateRemote,
  cmdValidateRemote,
  readRoadmapIssues,
  roadmapDir,
  buildRoadmapContent,
};
```

## kaola-workflow-claim.js Implementation

### Import (top, after existing requires ~line 13)
```js
const roadmapModule = require('./kaola-workflow-roadmap');
```

### archiveProjectDir addition (after existing main-worktree cleanup block, before return)
```js
if (statusValue === 'closed') {
  try {
    let stateContent = '';
    try { stateContent = fs.readFileSync(state, 'utf8'); } catch (_) {}
    const n = parseInt(field(stateContent, 'issue_number'), 10);
    if (Number.isInteger(n) && n > 0) {
      const roadmapFilePath = path.join(root, 'kaola-workflow', '.roadmap', 'issue-' + n + '.md');
      try { fs.unlinkSync(roadmapFilePath); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    roadmapModule.regenerateRoadmap(root);
  } catch (_) { /* non-fatal */ }
}
```
Note: state file already rewritten at line 423 but still has issue_number. Placement: BEFORE return {archived,dest} at line 439.

## Test Functions

### testFinalizeCleansRoadmapEntry() — flat temp repo, no git
- plantActiveFolder(tmp, 'issue-910', 910, null)
- plantRoadmapIssue(tmp, 910, ...) → .roadmap/issue-910.md with status:open
- generate ROADMAP.md → confirm #910 row present
- runNode(claimScript, ['finalize','--project','issue-910'], tmp) → assert status closed
- assert !fs.existsSync(.roadmap/issue-910.md)
- assert !ROADMAP.md.includes('#910')

### testFinalizeFromLinkedWorktreeCleansRoadmapEntry() — linked worktree path
- initGitRepo(tmp); writeGhShimForStartup(binDir)
- plantActiveFolder in main + linked worktrees, plantRoadmapIssue in main; git commit
- git worktree add -b workflow/issue-911 -- wtPath HEAD
- finalize --keep-worktree from wtPath
- assert .roadmap/issue-911.md deleted in wtPath
- assert git show HEAD --name-status includes 'D kaola-workflow/.roadmap/issue-911.md'
  (proves deletion staged into archive commit)

Both registered in main() near line 1400.

Optional: testValidateRemoteOffline() — validate-remote under OFFLINE=1 → "skipped: offline", exit 0.

## Edge Cases
- Missing/garbage issue_number: parseInt NaN → Number.isInteger guard skips unlink, still regens
- .roadmap/issue-N.md already absent: ENOENT caught, ignored (only re-throw non-ENOENT)
- guardAgainstMissingRoadmapSource throws: caught → non-fatal, archive succeeds
- abandoned status: gate is false → roadmap untouched (intentional)
- watch-pr MERGED: calls archiveProjectDir('closed') → cleanup automatic
- validate-remote with no .roadmap dir: readRoadmapIssues returns [] → ok, exit 0

## Out of Scope
- cmdRelease: unchanged
- validate-remote auto-fix: reports only
- cmdWatchPr CLOSED branch: correctly skipped
- Auto-running validate-remote in hooks/CI
