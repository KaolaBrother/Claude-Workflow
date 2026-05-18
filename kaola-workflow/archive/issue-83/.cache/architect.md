# Code Architect: Issue #83 — GitLab Merge Path Archives Before Sink Scripts Finish

## Design Decisions

- **No shared module for `resolveProjectFile`**: Two call sites in one file do not justify a shared module. The helper stays private to `sink-merge.js`.
- **`isSafeName` in Bug 2 is already in scope**: `kaola-gitlab-workflow-claim.js` imports it from `kaola-gitlab-workflow-active-folders` (lines 9-15). No new import needed.
- **`appendSummary` caller left unchanged**: `ensureMergeRequest` (sink-mr.js:122) calls `appendSummary` and ignores its return value. The new `boolean` return is backward-compatible; the caller must not be modified.
- **All unit tests go to `test-gitlab-sinks.js`**: Bug 2's sink-fallback tests are deliberately co-located there per spec, even though sink-fallback lives in claim.js.
- **Integration test in `simulate-gitlab-workflow-walkthrough.js`**: Add inline `testFallbackAfterArchive()` function using same imports pattern.
- **Export `readProjectInfo` from sink-merge.js**: Currently not exported. Must add to `module.exports` to enable direct unit testing of Bug 1.

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` | Add private `resolveProjectFile` helper; update `readProjectInfo` and `finalValidationPassed` to use it; export `readProjectInfo` | High |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` | Add archive guard + `isSafeName` assert to `cmdSinkFallback` | High |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` | Replace `fs.mkdirSync` in `appendSummary` with existence guard | High |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Add 7 unit test functions (Bug 1: 3, Bug 2: 3, Bug 3: 2) | Medium |
| `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js` | Add `testFallbackAfterArchive` inline + required imports | Medium |

## Files to Create

None. All changes are edits to existing files.

---

## Data Flow

```
cmdFinalize (step 8b)
  └─ archiveProjectDir()   renames kaola-workflow/{project}/ → kaola-workflow/archive/{project}/

Step 9: sink scripts execute AFTER archive
  ├─ kaola-gitlab-workflow-sink-merge.js
  │     finalValidationPassed()  ← reads phase6-summary.md
  │     readProjectInfo()        ← reads workflow-state.md
  │     Both now call resolveProjectFile() which checks live path first, archive fallback second
  │
  ├─ kaola-gitlab-workflow-claim.js  cmdSinkFallback()
  │     NEW: fs.existsSync(projectDir(root, args.project))
  │     → active dir missing → return {updated: false, reason: 'project archived'}
  │     → active dir present → proceed as before (sink: mr)
  │
  └─ kaola-gitlab-workflow-sink-mr.js  appendSummary()
        NEW: if (!fs.existsSync(path.dirname(summaryFile))) return false
        → archived dir missing → return false (no dir creation)
        → dir present → appendFileSync + return true
```

---

## Build Sequence

1. **Production fix: sink-merge.js** (`resolveProjectFile` + call sites + export `readProjectInfo`)
2. **Production fix: claim.js** (`cmdSinkFallback` archive guard)
3. **Production fix: sink-mr.js** (`appendSummary` existence guard)
   - Steps 1-3 are independent; parallel execution is safe.
4. **Unit tests: test-gitlab-sinks.js** (depends on all three production fixes being in place)
5. **Integration test: simulate-gitlab-workflow-walkthrough.js** (depends on step 4 passing)

---

## Task List

### Group A — Production Fixes (disjoint write-sets, parallel)

#### A1: Fix sink-merge.js (Bug 1)
- **File**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- **Test File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- **Write Set**: `kaola-gitlab-workflow-sink-merge.js` only
- **Depends On**: none
- **Parallel Group**: A
- **Action**: MODIFY
- **Implement**:
  1. Insert `resolveProjectFile` function after existing helpers near top of file:
     ```js
     function resolveProjectFile(root, project, basename) {
       const live = path.join(root, 'kaola-workflow', project, basename);
       if (fs.existsSync(live)) return live;
       const archived = path.join(root, 'kaola-workflow', 'archive', project, basename);
       if (fs.existsSync(archived)) return archived;
       return live; // let caller's try/catch handle missing
     }
     ```
  2. Update `readProjectInfo`: change `path.join(root, 'kaola-workflow', project, 'workflow-state.md')` to `resolveProjectFile(root, project, 'workflow-state.md')`
  3. Update `finalValidationPassed`: change `path.join(root, 'kaola-workflow', project, 'phase6-summary.md')` to `resolveProjectFile(root, project, 'phase6-summary.md')`
  4. Add `readProjectInfo` to `module.exports` (alongside existing: closeLinkedIssue, fastForwardMain, finalValidationPassed, runDirectMerge)
  5. `resolveProjectFile` is private — do NOT export it
- **Mirror**: no direct GitHub mirror (GitHub sink-merge uses CLI args only, not file reads)
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

#### A2: Fix claim.js (Bug 2)
- **File**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`
- **Test File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- **Write Set**: `kaola-gitlab-workflow-claim.js` only
- **Depends On**: none
- **Parallel Group**: A
- **Action**: MODIFY
- **Implement**: Replace `cmdSinkFallback` function body with:
  ```js
  function cmdSinkFallback() {
    const root = getRoot();
    const args = parseArgs(process.argv.slice(3));
    assert(args.project, '--project required');
    assert(isSafeName(args.project), 'unsafe project name');
    if (!fs.existsSync(projectDir(root, args.project))) {
      output({ updated: false, project: args.project, reason: 'project archived' });
      return;
    }
    const reason = args.reason || 'merge fallback';
    updateState(root, args.project, content => content
      .replace(/^sink:.*$/m, 'sink: mr')
      .replace(/^last_result:.*$/m, 'last_result: sink_fallback: ' + reason));
    output({ updated: true, project: args.project, sink: 'mr', reason });
  }
  ```
- **Note**: `isSafeName` already in scope (imported from kaola-gitlab-workflow-active-folders). `projectDir` already defined. `output` already defined. No new imports needed. Keep `sink: mr` (not `pr`) — GitLab-specific.
- **Mirror**: `scripts/kaola-workflow-claim.js` `cmdSinkFallback` with `fs.existsSync(projectDir(root, args.project))` guard
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

#### A3: Fix sink-mr.js (Bug 3)
- **File**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- **Test File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- **Write Set**: `kaola-gitlab-workflow-sink-mr.js` only
- **Depends On**: none
- **Parallel Group**: A
- **Action**: MODIFY
- **Implement**: Replace `appendSummary` function with:
  ```js
  function appendSummary(summaryFile, mrUrl, mrIid) {
    if (!fs.existsSync(path.dirname(summaryFile))) return false;
    fs.appendFileSync(summaryFile, '\nMR URL: ' + mrUrl + '\nMR IID: ' + mrIid + '\n');
    return true;
  }
  ```
- **Note**: `ensureMergeRequest` (line ~122) calls `appendSummary` and ignores return value — do NOT modify caller. `fs` and `path` already imported. Remove the `fs.mkdirSync` call.
- **Mirror**: `updateStateSinkBlock` pattern (line ~58: `if (!fs.existsSync(stateFile)) return false`)
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

---

### Group B — Unit Tests (sequential after Group A)

#### B1: Add unit tests to test-gitlab-sinks.js
- **File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- **Test File**: same file
- **Write Set**: `test-gitlab-sinks.js` only
- **Depends On**: A1, A2, A3
- **Parallel Group**: serial (after A)
- **Action**: MODIFY
- **Required new imports** (add at top):
  ```js
  const { spawnSync } = require('child_process');
  const claimScript = path.join(__dirname, 'kaola-gitlab-workflow-claim.js');
  ```
  Note: `sinkMr` and `sinkMerge` may already be imported — check existing requires and don't duplicate. `assert`, `fs`, `os`, `path` already present.
- **Implement 7 test functions**:

  **Bug 1 — testFinalValidationPassedArchived**
  ```
  - tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-fvp-archived-'))
  - Write kaola-workflow/test-proj/phase6-summary.md with 'Final Validation: pass' content
  - fs.mkdirSync(path.join(tmpRoot, 'kaola-workflow', 'archive'), {recursive: true})
  - fs.renameSync(live dir, archive dir)
  - result = sinkMerge.finalValidationPassed(tmpRoot, 'test-proj')
  - assert(result === true, 'finalValidationPassed should return true from archive fallback')
  - cleanup
  ```

  **Bug 1 — testReadProjectInfoArchived**
  ```
  - tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-rpi-archived-'))
  - Write kaola-workflow/test-proj/workflow-state.md with project_id: 42, path_with_namespace: group/proj, project_web_url: https://example.com
  - fs.renameSync(live dir, archive dir)
  - result = sinkMerge.readProjectInfo(tmpRoot, 'test-proj')
  - assert(result.project_id === 42)
  - assert(result.path_with_namespace === 'group/proj')
  - assert(result.web_url === 'https://example.com')
  - cleanup
  ```

  **Bug 1 — testRunDirectMergeAfterArchive**
  ```
  - tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-rdm-archived-'))
  - Write live project files (workflow-state.md + phase6-summary.md with passing content)
  - fs.renameSync(live, archive)
  - Call sinkMerge.runDirectMerge({branch: 'workflow/test-proj', project: 'test-proj', issue: '99'}, {root: tmpRoot, skipGit: true}) with withForge stubs for createIssueNote/closeIssue
  - Assert: no throw
  - cleanup
  ```
  Note: mirror existing test around lines 148-172 in test-gitlab-sinks.js for withForge pattern.

  **Bug 2 — testSinkFallbackSkipsArchivedProject**
  ```
  - tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-sfskip-'))
  - (no kaola-workflow/already-archived dir created)
  - result = spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', 'already-archived'], {cwd: tmpRoot, encoding: 'utf8', env: {...process.env, KAOLA_WORKFLOW_OFFLINE: '1'}})
  - assert(result.status === 0)
  - parsed = JSON.parse(result.stdout)
  - assert(parsed.updated === false)
  - assert(parsed.reason === 'project archived')
  - assert(!fs.existsSync(path.join(tmpRoot, 'kaola-workflow', 'already-archived')))
  - cleanup
  ```

  **Bug 2 — testSinkFallbackLiveDirPresent**
  ```
  - tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-sflive-'))
  - Create kaola-workflow/active-project/ dir with workflow-state.md containing 'sink: merge\nbranch: workflow/active-project\nlast_result: phase6_complete'
  - result = spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', 'active-project'], {cwd: tmpRoot, encoding: 'utf8', env: {...process.env, KAOLA_WORKFLOW_OFFLINE: '1'}})
  - assert(result.status === 0)
  - parsed = JSON.parse(result.stdout)
  - assert(parsed.updated === true)
  - assert(parsed.sink === 'mr')
  - cleanup
  ```

  **Bug 2 — testSinkFallbackUnsafeName**
  ```
  - tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-sfunsafe-'))
  - result = spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', '../escape'], {cwd: tmpRoot, encoding: 'utf8', env: {...process.env, KAOLA_WORKFLOW_OFFLINE: '1'}})
  - assert(result.status !== 0 || result.stderr.includes('unsafe') || result.stdout.includes('unsafe'))
  - cleanup
  ```

  **Bug 3 — testAppendSummaryArchivedDir**
  ```
  - tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-appsum-archived-'))
  - summaryFile = path.join(tmpRoot, 'kaola-workflow', 'gone-project', 'phase6-summary.md')
  - (parent dir does NOT exist)
  - result = sinkMr.appendSummary(summaryFile, 'https://example/mr/1', 1)
  - assert(result === false)
  - assert(!fs.existsSync(path.dirname(summaryFile)))
  - cleanup
  ```

  **Bug 3 — testAppendSummaryPositive**
  ```
  - tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-appsum-live-'))
  - fs.mkdirSync(path.join(tmpRoot, 'kaola-workflow', 'live-project'), {recursive: true})
  - summaryFile = path.join(tmpRoot, 'kaola-workflow', 'live-project', 'phase6-summary.md')
  - result = sinkMr.appendSummary(summaryFile, 'https://example/mr/2', 2)
  - assert(result === true)
  - content = fs.readFileSync(summaryFile, 'utf8')
  - assert(content.includes('MR URL: https://example/mr/2'))
  - assert(content.includes('MR IID: 2'))
  - cleanup
  ```

- Call all 7 test functions in the main() function (or at module level, matching existing pattern)
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

---

### Group C — Integration Test (sequential after Group B)

#### C1: Add testFallbackAfterArchive to simulate-gitlab-workflow-walkthrough.js
- **File**: `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js`
- **Write Set**: `simulate-gitlab-workflow-walkthrough.js` only
- **Depends On**: B1
- **Parallel Group**: serial (after B)
- **Action**: MODIFY
- **Required imports** (add at top):
  ```js
  const fs = require('fs');
  const os = require('os');
  const { spawnSync } = require('child_process');
  const assert = require('assert');
  const sinkMr = require('./kaola-gitlab-workflow-sink-mr');
  const sinkMerge = require('./kaola-gitlab-workflow-sink-merge');
  const claimScript = path.join(__dirname, 'kaola-gitlab-workflow-claim.js');
  ```
- **Implement `testFallbackAfterArchive()`**:
  ```
  function testFallbackAfterArchive() {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-fallback-archive-'));
    try {
      // Arrange: live project with workflow-state.md and phase6-summary.md
      const liveDir = path.join(tmpRoot, 'kaola-workflow', 'fb-project');
      fs.mkdirSync(liveDir, {recursive: true});
      fs.writeFileSync(path.join(liveDir, 'workflow-state.md'), '## Project\nname: fb-project\nstatus: active\n## Sink\nbranch: workflow/fb-project\nsink: merge\n');
      fs.writeFileSync(path.join(liveDir, 'phase6-summary.md'), '# Phase 6 Summary\n## Final Validation\nFinal Validation: pass\n');

      // Simulate cmdFinalize: archive the project dir
      fs.mkdirSync(path.join(tmpRoot, 'kaola-workflow', 'archive'), {recursive: true});
      const archiveDest = path.join(tmpRoot, 'kaola-workflow', 'archive', 'fb-project');
      fs.renameSync(liveDir, archiveDest);

      // Snapshot archive content before dispatch chain
      const snapshot = {};
      for (const f of fs.readdirSync(archiveDest)) {
        snapshot[f] = fs.readFileSync(path.join(archiveDest, f), 'utf8');
      }

      // Step 1: cmdSinkFallback — should return {updated: false, reason: 'project archived'}
      const fbResult = spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', 'fb-project'],
        {cwd: tmpRoot, encoding: 'utf8', env: {...process.env, KAOLA_WORKFLOW_OFFLINE: '1'}});
      assert.strictEqual(fbResult.status, 0, 'sink-fallback should exit 0 on archived project');
      const fbParsed = JSON.parse(fbResult.stdout);
      assert.strictEqual(fbParsed.updated, false, 'updated should be false');
      assert.strictEqual(fbParsed.reason, 'project archived', 'reason should be project archived');
      assert(!fs.existsSync(liveDir), 'live dir must not be recreated by sink-fallback');

      // Step 2: appendSummary on archived path — should return false, not recreate dir
      const summaryFile = path.join(tmpRoot, 'kaola-workflow', 'fb-project', 'phase6-summary.md');
      const appendResult = sinkMr.appendSummary(summaryFile, 'https://gl.example/mr/99', 99);
      assert.strictEqual(appendResult, false, 'appendSummary should return false on archived dir');
      assert(!fs.existsSync(path.join(tmpRoot, 'kaola-workflow', 'fb-project')), 'appendSummary must not recreate live dir');

      // Step 3: verify archive is byte-for-byte unchanged
      for (const [f, originalContent] of Object.entries(snapshot)) {
        const currentContent = fs.readFileSync(path.join(archiveDest, f), 'utf8');
        assert.strictEqual(currentContent, originalContent, `archive file ${f} must be unchanged`);
      }

      console.log('testFallbackAfterArchive: PASSED');
    } finally {
      fs.rmSync(tmpRoot, {recursive: true, force: true});
    }
  }
  ```
- Call `testFallbackAfterArchive()` before the existing `run(...)` calls
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js`

---

## Parallelization Plan

| Group | Tasks | Files | Parallel? | Justification |
|-------|-------|-------|-----------|---------------|
| A | A1, A2, A3 | sink-merge.js, claim.js, sink-mr.js | Yes | Three distinct files, zero shared state |
| B | B1 | test-gitlab-sinks.js | No (single task) | Single writer; must follow Group A |
| C | C1 | simulate-gitlab-workflow-walkthrough.js | No | Must follow Group B passing |

---

## Required Imports/Dependencies Per File

| File | New Imports | Already Present |
|------|------------|----------------|
| sink-merge.js | none | `fs`, `path` |
| claim.js | none | `fs`, `path`, `isSafeName`, `projectDir`, `output`, `assert` |
| sink-mr.js | none | `fs`, `path` |
| test-gitlab-sinks.js | `spawnSync` from `child_process`, `claimScript` constant | `assert`, `fs`, `os`, `path`, `sinkMr`, `sinkMerge` |
| simulate-gitlab-workflow-walkthrough.js | `fs`, `os`, `spawnSync`, `assert`, `sinkMr`, `sinkMerge`, `claimScript` | `path`, existing runner |

---

## Explicit Out-of-Scope Items

1. `plugins/kaola-workflow-gitlab/commands/` — read-only; no changes
2. No new CLI flags on any script
3. `kaola-gitlab-workflow-active-folders.js` — no changes
4. `kaola-gitlab-forge.js` — no changes
5. `scripts/` (GitHub plugin) — no changes
6. `cmdFinalize` itself — archive timing is intentional; do not change
7. `ensureMergeRequest` in sink-mr.js — do not modify caller
8. `updateState` / `writeFile` in claim.js — do not change; early return prevents call on archived projects
9. Normal `sink: mr` path (Step 8b not reached on MR path) — safe by design; no change needed
