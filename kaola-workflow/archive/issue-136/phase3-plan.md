# Phase 3 - Plan: issue-136

## Blueprint

### Files to Create
None. All changes modify existing files.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-roadmap.js` | Extract `regenerateRoadmap(root)` silent helper; refactor `cmdGenerate` to wrap it; add `validateRemote()` + `cmdValidateRemote()`; wire `validate-remote` in `main()`; add `module.exports`; add `issueIsClosed` import | Core fix — enables in-process regen without stdout pollution; adds audit subcommand |
| `scripts/kaola-workflow-claim.js` | Add `require('./kaola-workflow-roadmap')`; insert closed-gate roadmap cleanup block in `archiveProjectDir` | Core fix — removes stale .roadmap/issue-N.md on every closure path |
| `scripts/simulate-workflow-walkthrough.js` | Add `testFinalizeCleansRoadmapEntry()`, `testFinalizeFromLinkedWorktreeCleansRoadmapEntry()`, `testValidateRemoteOffline()`; register in `main()` | Regression coverage for AC #4 |
| `kaola-workflow/.roadmap/issue-133.md` | DELETE | Live drift data fix (AC #3) |
| `kaola-workflow/ROADMAP.md` | Regenerate after deletion | Mirror sync after data fix |
| `CHANGELOG.md` | Add entry under `[Unreleased]` mentioning validate-remote subcommand and closure cleanup | Documentation |

### Build Sequence
1. `kaola-workflow-roadmap.js` — add exports, extract regenerateRoadmap, add validate-remote (no upstream deps)
2. `kaola-workflow-claim.js` — import roadmap module, add closed-gate cleanup in archiveProjectDir (depends on T1)
3. `simulate-workflow-walkthrough.js` — add 3 tests and register (depends on T1+T2)
4. Verify: `node scripts/simulate-workflow-walkthrough.js` exits 0 with "Workflow walkthrough simulation passed"
5. Data fix: `rm kaola-workflow/.roadmap/issue-133.md && node scripts/kaola-workflow-roadmap.js generate`
6. `CHANGELOG.md` — add entry

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A (serial) | T1 → T2 | T2 requires T1's exported regenerateRoadmap |
| B (parallel after A) | T3 + T6 | Disjoint write sets (tests vs CHANGELOG) |
| T5 (last after verify) | Data fix | Sequential: must use corrected code |

### External Dependencies
None new. Existing: `fs`, `path` (standard Node), `issueIsClosed` from `kaola-workflow-active-folders.js` (already exported).

## Task List

### Task 1: Extract regenerateRoadmap + add module.exports + wire validate-remote
- File: `scripts/kaola-workflow-roadmap.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-roadmap.js`
- Depends On: none
- Parallel Group: A (serial first)
- Action: MODIFY

**Pre-implementation verifications:**
- Confirm `const path = require('path')` exists at claim.js top (for Task 2)
- Verify `field()` helper in active-folders.js parses `issue_number` field (grep `field` function body)
- Confirm `git add -A kaola-workflow/` + commit exists in cmdFinalize's --keep-worktree branch (for Task 3)
- Confirm `buildRoadmapContent([])` produces valid empty-table ROADMAP.md without triggering guardAgainstMissingRoadmapSource (guard fires on missing dir, not zero entries)

**Implement:**

Add import at top (after existing requires, ~line 5):
```js
const { issueIsClosed } = require('./kaola-workflow-active-folders');
```

Replace `cmdGenerate` (lines 187–196) with:
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

Add after `cmdValidate` (line ~239):
```js
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
    process.stdout.write('skipped: offline\n');
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

Wire in `main()` after `validate` case (before unknown-sub handler, ~line 299):
```js
if (sub === 'validate-remote') { cmdValidateRemote(); return; }
```

Add `module.exports` before `require.main` guard (line 303):
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

- Mirror: `init-issue` exclusive-open pattern; `issueIsClosed()` in active-folders.js:38–48
- Validate: `KAOLA_WORKFLOW_OFFLINE=1 node scripts/kaola-workflow-roadmap.js validate-remote` → `skipped: offline`, exit 0

---

### Task 2: Roadmap cleanup in archiveProjectDir
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-claim.js`
- Depends On: Task 1
- Parallel Group: A (serial second)
- Action: MODIFY

**Implement:**

Add import at top (after existing requires, ~line 13):
```js
const roadmapModule = require('./kaola-workflow-roadmap');
```

In `archiveProjectDir` (lines 411–440), insert BEFORE the final `return { archived: true, dest }`:
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
  } catch (_) { /* roadmap mirror cleanup is non-fatal; archive already completed */ }
}
```

Gate semantics:
- `cmdFinalize` passes `'closed'` → cleanup runs ✓
- `watch-pr` MERGED passes `'closed'` → cleanup runs ✓
- `cmdRelease` passes `'abandoned'` → cleanup SKIPPED (intentional: issue stays open) ✓
- `watch-pr` CLOSED passes `'abandoned'` → cleanup SKIPPED ✓

- Mirror: `archiveProjectDir` pattern at lines 411–440
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0

---

### Task 3: Regression tests
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Tasks 1 + 2
- Parallel Group: B (parallel with T6)
- Action: MODIFY

**testFinalizeCleansRoadmapEntry()** — flat temp, OFFLINE=1 in env:
1. `plantActiveFolder(tmp, 'issue-910', 910, null)` — creates workflow-state.md with issue_number:910
2. Create `.roadmap/issue-910.md` with `status: open`
3. `runNode(roadmapScript, ['generate'], tmp, { env: OFFLINE=1 })` → generates ROADMAP.md with #910
4. Assert ROADMAP.md contains `#910`
5. `runNode(claimScript, ['finalize','--project','issue-910'], tmp, { env: OFFLINE=1 })` → assert stdout JSON has status:'closed'
6. Assert `!fs.existsSync(join(tmp,'kaola-workflow','.roadmap','issue-910.md'))`
7. Assert `!readFileSync(join(tmp,'kaola-workflow','ROADMAP.md')).includes('#910')`

**testFinalizeFromLinkedWorktreeCleansRoadmapEntry()** — linked worktree, OFFLINE=1:
1. `initGitRepo(tmp)` + gh shim for clearAdvisoryClaim (or OFFLINE=1 to skip gh calls)
2. `plantActiveFolder(tmp,'issue-911',911,null)` + create `.roadmap/issue-911.md` in main worktree
3. `git -C tmp add -A && git -C tmp commit -m 'plant'` (so .roadmap/ is on HEAD)
4. `git -C tmp worktree add -b workflow/issue-911 -- wtPath HEAD`
5. `plantActiveFolder(wtPath,'issue-911',911,null)` in linked worktree
6. `runNode(claimScript, ['finalize','--project','issue-911','--keep-worktree'], wtPath, { env: OFFLINE=1 })`
7. Assert `!fs.existsSync(join(wtPath,'kaola-workflow','.roadmap','issue-911.md'))`
8. Assert `git -C wtPath show HEAD --name-status` output includes `D\tkaola-workflow/.roadmap/issue-911.md`
9. Cleanup: `git -C tmp worktree remove --force wtPath`

**testValidateRemoteOffline()** — REQUIRED (not optional):
1. `runNode(roadmapScript, ['validate-remote'], tmp, { env: KAOLA_WORKFLOW_OFFLINE='1' })`
2. Assert stdout === 'skipped: offline\n'
3. Assert exit code === 0

Register all 3 in `main()` near line 1400:
```js
testFinalizeCleansRoadmapEntry();
testFinalizeFromLinkedWorktreeCleansRoadmapEntry();
testValidateRemoteOffline();
```

- Mirror: `testRoadmapGenerateMissingSourceGuard` (lines 155–195); `testFinalizeFromLinkedWorktreeCleansMainCopy` (lines 619–666); gh shim pattern (lines 335–345)
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0

---

### Task 4: Data fix
- File: `kaola-workflow/.roadmap/issue-133.md` (delete) + `kaola-workflow/ROADMAP.md` (regenerate)
- Write Set: both files
- Depends On: Tasks 1–3 verified
- Parallel Group: serial (last code task)
- Action: MODIFY

```bash
rm kaola-workflow/.roadmap/issue-133.md
node scripts/kaola-workflow-roadmap.js generate
```

Verify ROADMAP.md no longer contains `#133` row.

---

### Task 5: CHANGELOG
- File: `CHANGELOG.md`
- Write Set: `CHANGELOG.md`
- Depends On: none (independent)
- Parallel Group: B (parallel with T3)
- Action: MODIFY

Add under `[Unreleased]`:
```
- feat: remove stale `.roadmap/issue-N.md` on archive/finalize (AC #1, #3 — issue #136)
- feat: add `validate-remote` subcommand to roadmap script to detect closed-remote drift (AC #2 — issue #136)
```

---

## Advisor Notes
- testValidateRemoteOffline promoted from optional to required — only test enforcing "do not silently pass under OFFLINE"
- Both finalize tests must use KAOLA_WORKFLOW_OFFLINE=1 to avoid non-deterministic clearAdvisoryClaim gh calls
- Pre-implementation: verify path module in claim.js; verify field() parses issue_number; verify git add -A exists in keep-worktree branch
- buildRoadmapContent([]) edge case: guard fires on missing dir, not zero entries — verify during implementation

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | | Advisor approved without gaps; no revision needed |
