# Phase 3 - Plan: issue-83

## Blueprint

### Files to Create
None. All changes are edits to existing files.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` | Add private `resolveProjectFile` helper; update `readProjectInfo` and `finalValidationPassed` to use it | Bug 1: these functions read from active path which has been archived |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` | Add `isSafeName` assert + `fs.existsSync(projectDir(...))` guard to `cmdSinkFallback` | Bug 2: no archive guard; `updateState` blindly recreates archived directory |
| `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js` | Replace `fs.mkdirSync` in `appendSummary` with existence guard | Bug 3: `fs.mkdirSync(recursive:true)` recreates archived directory on fallback path |
| `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | Add 6 unit test functions (Bug 1: 2, Bug 2: 3, Bug 3: 2) | New coverage for all three bugs post-archive |
| `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js` | Add `testFallbackGuardsAfterArchive` + required imports | End-to-end verification of archive-safe dispatch chain |

### Build Sequence
1. A1, A2, A3 (parallel) — production fixes in three independent files
2. B1 — unit tests in test-gitlab-sinks.js (depends on A1+A2+A3 complete)
3. C1 — integration test in simulate-gitlab-workflow-walkthrough.js (depends on B1 passing)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | A1, A2, A3 | Disjoint write sets: sink-merge.js, claim.js, sink-mr.js — no shared state |
| B | B1 | Single writer; must follow Group A |
| C | C1 | Must follow Group B passing; imports Group A production modules |

### External Dependencies
None — `fs`, `path`, `child_process`, `assert`, `os` are all Node built-ins already in use.

---

## Task List

### Task 1 (A1): Fix sink-merge.js — archive-aware path resolution (Bug 1)
- **File**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- **Test File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- **Write Set**: `kaola-gitlab-workflow-sink-merge.js` only
- **Depends On**: none
- **Parallel Group**: A
- **Action**: MODIFY
- **Implement**:
  1. Read the file first to find current line numbers for `readProjectInfo` and `finalValidationPassed`
  2. Insert after existing helper functions near top of file (before `readProjectInfo`):
     ```js
     function resolveProjectFile(root, project, basename) {
       const live = path.join(root, 'kaola-workflow', project, basename);
       if (fs.existsSync(live)) return live;
       const archived = path.join(root, 'kaola-workflow', 'archive', project, basename);
       if (fs.existsSync(archived)) return archived;
       return live; // let caller's try/catch handle missing
     }
     ```
  3. In `readProjectInfo`: change `path.join(root, 'kaola-workflow', project, 'workflow-state.md')` to `resolveProjectFile(root, project, 'workflow-state.md')`
  4. In `finalValidationPassed`: change `path.join(root, 'kaola-workflow', project, 'phase6-summary.md')` to `resolveProjectFile(root, project, 'phase6-summary.md')`
  5. `resolveProjectFile` is private — do NOT add to `module.exports`
  6. No new imports needed (`fs` and `path` already present)
  7. Do NOT export `readProjectInfo` (advisor finding #1: no API expansion; tested indirectly via `runDirectMerge`)
- **Mirror**: No direct GitHub mirror for `resolveProjectFile`; pattern invented for GitLab archive-awareness
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

### Task 2 (A2): Fix claim.js — archive guard in cmdSinkFallback (Bug 2)
- **File**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`
- **Test File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- **Write Set**: `kaola-gitlab-workflow-claim.js` only
- **Depends On**: none
- **Parallel Group**: A
- **Action**: MODIFY
- **Implement**:
  1. Read the file first to find current line numbers for `cmdSinkFallback` — Phase 1 cited lines 547-556 but file may have shifted
  2. Verify before editing: `projectDir(root, project)` returns `path.join(root, 'kaola-workflow', project)`, and `isSafeName`, `output`, `assert` are in scope at `cmdSinkFallback`
  3. Replace `cmdSinkFallback` function body with:
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
  4. No new imports needed. `isSafeName` already imported from `kaola-gitlab-workflow-active-folders`. `fs`, `path`, `projectDir`, `output` already in scope.
  5. Keep `sink: mr` (not `pr`) — this is the GitLab-specific value, correct for GitLab MR path.
  6. `isSafeName` addition is a hardening side-effect — not a new feature, but a port of existing GitHub behavior.
- **Mirror**: `scripts/kaola-workflow-claim.js` `cmdSinkFallback` with `fs.existsSync(projectDir(root, args.project))` guard (actual GitHub pattern, NOT `activeByProject`)
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

### Task 3 (A3): Fix sink-mr.js — appendSummary existence guard (Bug 3)
- **File**: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- **Test File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- **Write Set**: `kaola-gitlab-workflow-sink-mr.js` only
- **Depends On**: none
- **Parallel Group**: A
- **Action**: MODIFY
- **Implement**:
  1. Read the file first to confirm current `appendSummary` body and that `fs` and `path` are imported
  2. Replace `appendSummary` function with:
     ```js
     function appendSummary(summaryFile, mrUrl, mrIid) {
       if (!fs.existsSync(path.dirname(summaryFile))) return false;
       fs.appendFileSync(summaryFile, '\nMR URL: ' + mrUrl + '\nMR IID: ' + mrIid + '\n');
       return true;
     }
     ```
  3. Remove the `fs.mkdirSync` call that was in the original function body
  4. Do NOT modify `ensureMergeRequest` (line ~122) which calls `appendSummary` and ignores return value — backward-compatible
  5. No new imports needed (`fs` and `path` already present)
- **Mirror**: `updateStateSinkBlock` pattern (`if (!fs.existsSync(stateFile)) return false`)
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

### Task 4 (B1): Add unit tests to test-gitlab-sinks.js
- **File**: `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`
- **Test File**: same file
- **Write Set**: `test-gitlab-sinks.js` only
- **Depends On**: Task 1 (A1), Task 2 (A2), Task 3 (A3)
- **Parallel Group**: serial (after Group A)
- **Action**: MODIFY
- **Implement**:
  Read the file first to understand:
  - Current imports (avoid duplicates)
  - How tests are invoked (module-level calls, `main()` function, or both)
  - Existing test pattern for `withForge` and tmp dirs

  Add new imports at top if not already present:
  ```js
  const { spawnSync } = require('child_process');
  const claimScript = path.join(__dirname, 'kaola-gitlab-workflow-claim.js');
  ```

  Add 6 test functions (not 7 — `testReadProjectInfoArchived` dropped per advisor finding #1):

  **Bug 1 — testFinalValidationPassedArchived**
  ```
  Arrange: tmpRoot, create kaola-workflow/test-proj/phase6-summary.md with content 'Final Validation: pass'
  Simulate archive: fs.renameSync(live dir → archive dir)
  Act: result = sinkMerge.finalValidationPassed(tmpRoot, 'test-proj')
  Assert: result === true (archive fallback worked)
  Cleanup: fs.rmSync(tmpRoot, {recursive: true, force: true})
  ```

  **Bug 1 — testRunDirectMergeAfterArchive** (also tests readProjectInfo indirectly)
  ```
  Arrange: tmpRoot, write live workflow-state.md (project_id: 42, path_with_namespace, project_web_url) + phase6-summary.md with Final Validation pass content
  Simulate archive: fs.renameSync(live → archive)
  Act: call sinkMerge.runDirectMerge({branch: 'workflow/test-proj', project: 'test-proj', issue: '99'}, {root: tmpRoot, skipGit: true}) with withForge stubs for createIssueNote and closeIssue
  Assert: no throw
  Cleanup
  ```

  **Bug 2 — testSinkFallbackSkipsArchivedProject**
  ```
  Arrange: tmpRoot with no kaola-workflow/already-archived dir
  Act: spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', 'already-archived'], {cwd: tmpRoot, encoding: 'utf8', env: {...process.env, KAOLA_WORKFLOW_OFFLINE: '1'}})
  Assert: status === 0
  Assert: JSON.parse(stdout).updated === false
  Assert: JSON.parse(stdout).reason === 'project archived'
  Assert: !fs.existsSync(path.join(tmpRoot, 'kaola-workflow', 'already-archived'))
  Cleanup
  ```

  **Bug 2 — testSinkFallbackLiveDirPresent**
  ```
  Arrange: tmpRoot, create kaola-workflow/active-project/workflow-state.md with 'sink: merge\nbranch: workflow/active-project\nlast_result: phase6_complete'
  Act: spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', 'active-project'], {cwd: tmpRoot, encoding: 'utf8', env: {...process.env, KAOLA_WORKFLOW_OFFLINE: '1'}})
  Assert: status === 0
  Assert: JSON.parse(stdout).updated === true
  Assert: JSON.parse(stdout).sink === 'mr'
  Cleanup
  ```

  **Bug 2 — testSinkFallbackUnsafeName**
  ```
  Arrange: tmpRoot
  Act: spawnSync(process.execPath, [claimScript, 'sink-fallback', '--project', '../escape'], {cwd: tmpRoot, encoding: 'utf8', env: {...process.env, KAOLA_WORKFLOW_OFFLINE: '1'}})
  Assert: result.status !== 0  [AND-style — both conditions must hold]
  Assert: result.stderr.includes('unsafe project name')
  Cleanup
  ```
  NOTE: Must use AND-style assertion, not OR. See advisor finding #2.

  **Bug 3 — testAppendSummaryArchivedDir**
  ```
  Arrange: tmpRoot, summaryFile = path.join(tmpRoot, 'kaola-workflow', 'gone-project', 'phase6-summary.md') (parent dir does NOT exist)
  Act: result = sinkMr.appendSummary(summaryFile, 'https://example/mr/1', 1)
  Assert: result === false
  Assert: !fs.existsSync(path.dirname(summaryFile))
  Cleanup
  ```

  **Bug 3 — testAppendSummaryPositive**
  ```
  Arrange: tmpRoot, fs.mkdirSync(path.join(tmpRoot, 'kaola-workflow', 'live-project'), {recursive: true})
  summaryFile = path.join(tmpRoot, 'kaola-workflow', 'live-project', 'phase6-summary.md')
  Act: result = sinkMr.appendSummary(summaryFile, 'https://example/mr/2', 2)
  Assert: result === true
  Assert: fs.readFileSync(summaryFile, 'utf8').includes('MR URL: https://example/mr/2')
  Assert: fs.readFileSync(summaryFile, 'utf8').includes('MR IID: 2')
  Cleanup
  ```

  Invoke all 6 test functions matching the file's existing execution model.
- **Mirror**: `scripts/simulate-workflow-walkthrough.js` lines 531-570 (`testSinkFallbackSkipsArchivedProject`)
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js`

### Task 5 (C1): Add testFallbackGuardsAfterArchive to simulate-gitlab-workflow-walkthrough.js
- **File**: `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js`
- **Write Set**: `simulate-gitlab-workflow-walkthrough.js` only
- **Depends On**: Task 4 (B1)
- **Parallel Group**: serial (after B)
- **Action**: MODIFY
- **Implement**:
  Read the file first to understand current imports and invocation pattern.
  Add new imports if not already present:
  ```js
  const fs = require('fs');
  const os = require('os');
  const { spawnSync } = require('child_process');
  const assert = require('assert');
  const sinkMr = require('./kaola-gitlab-workflow-sink-mr');
  const sinkMerge = require('./kaola-gitlab-workflow-sink-merge');
  const claimScript = path.join(__dirname, 'kaola-gitlab-workflow-claim.js');
  ```

  Add `testFallbackGuardsAfterArchive()` function before existing `run(...)` calls:
  ```
  function testFallbackGuardsAfterArchive() {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-gl-fallback-archive-'));
    try {
      // Arrange: live project files
      const liveDir = path.join(tmpRoot, 'kaola-workflow', 'fb-project');
      fs.mkdirSync(liveDir, {recursive: true});
      fs.writeFileSync(path.join(liveDir, 'workflow-state.md'),
        '## Project\nname: fb-project\nstatus: active\n## Sink\nbranch: workflow/fb-project\nsink: merge\n');
      fs.writeFileSync(path.join(liveDir, 'phase6-summary.md'),
        '# Phase 6 Summary\n## Final Validation\nFinal Validation: pass\n');

      // Simulate cmdFinalize: archive the project dir
      fs.mkdirSync(path.join(tmpRoot, 'kaola-workflow', 'archive'), {recursive: true});
      const archiveDest = path.join(tmpRoot, 'kaola-workflow', 'archive', 'fb-project');
      fs.renameSync(liveDir, archiveDest);

      // Snapshot archive content before dispatch chain
      const snapshot = {};
      for (const f of fs.readdirSync(archiveDest)) {
        snapshot[f] = fs.readFileSync(path.join(archiveDest, f), 'utf8');
      }

      // Step 1: cmdSinkFallback — archived project should return updated: false
      const fbResult = spawnSync(process.execPath,
        [claimScript, 'sink-fallback', '--project', 'fb-project'],
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
      assert(!fs.existsSync(path.join(tmpRoot, 'kaola-workflow', 'fb-project')),
        'appendSummary must not recreate live dir');

      // Step 3: verify archive is byte-for-byte unchanged
      for (const [f, originalContent] of Object.entries(snapshot)) {
        const currentContent = fs.readFileSync(path.join(archiveDest, f), 'utf8');
        assert.strictEqual(currentContent, originalContent, `archive file ${f} must be unchanged`);
      }

      console.log('testFallbackGuardsAfterArchive: PASSED');
    } finally {
      fs.rmSync(tmpRoot, {recursive: true, force: true});
    }
  }
  ```

  Call `testFallbackGuardsAfterArchive()` before the existing `run(...)` invocations.
- **Mirror**: `scripts/simulate-workflow-walkthrough.js` `testSinkFallbackSkipsArchivedProject` pattern
- **Validate**: `node plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js`

---

## Advisor Notes

Advisor approved blueprint with refinements applied directly to task definitions above:

1. **API expansion avoided** (finding #1): `readProjectInfo` NOT exported; tested indirectly via `testRunDirectMergeAfterArchive` which calls both `readProjectInfo` and `finalValidationPassed`. Task count reduced from 7 to 6 unit tests.
2. **Unsafe name assertion tightened** (finding #2): `testSinkFallbackUnsafeName` uses AND-style — both `status !== 0` AND `stderr.includes('unsafe project name')` required.
3. **Integration test renamed** (finding #3): `testFallbackGuardsAfterArchive` accurately reflects scope (guards on `cmdSinkFallback` + `appendSummary`, not sink-merge subprocess).
4. **Verify-before-edit** (finding #4): Task A2 explicitly instructs reading the file first to verify `projectDir`, `isSafeName`, `output`, and `assert` are in scope and line numbers are current.

---

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Advisor approved blueprint; no gaps requiring architect revision |
