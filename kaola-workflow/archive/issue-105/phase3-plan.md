# Phase 3 - Plan: issue-105

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-sink-merge.js` | Add `assertNoLiveWorkflowFolder` helper after line 69; wire call site between lines 243–244 | Core guard: fails loudly before any main-mutating step if live folder still present on branch HEAD |
| `scripts/simulate-workflow-walkthrough.js` | Add `testSinkMergeRefusesLiveFolder` + `testFastE2EMergeFullChain` after line 1084; register both after line 1291 | Regression coverage: negative test proves guard fires; positive E2E test proves fast-path lands archive correctly (AC#3) |
| `commands/kaola-workflow-phase6.md` | One sentence appended inside step 8b paragraph (lines 489–523) | Documents the new guard so agents know why sink-merge will refuse |

### Build Sequence
1. A1 — Add `assertNoLiveWorkflowFolder` helper to sink-merge.js (no dependencies)
2. A2 — Wire call site in main() between lines 243–244 (depends on A1)
3. B1 — Add `testSinkMergeRefusesLiveFolder` to walkthrough (depends on A2 for testable behavior)
4. B2 — Add `testFastE2EMergeFullChain` to walkthrough (parallel with B1)
5. B3 — Register both tests in main() after line 1291 (depends on B1 + B2)
6. C1 — Phase6.md one-sentence addition (parallelizable with A+B)
7. D1 — Run `node scripts/simulate-workflow-walkthrough.js` (depends on A+B+C)
8. E1 — AC#4 cleanup commit 1: issue-101 (`git rm + git add archive + commit`)
9. E2 — AC#4 cleanup commit 2: issue-100 (`git rm + rm -rf + git add archive + commit`)

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | A1, A2 | Serial within group (A2 depends on A1) |
| B+C | B1, B2, C1 | B1 and B2 touch disjoint test functions; C1 touches a different file entirely |
| D | D1 | Validation; runs after A+B+C |
| E | E1, E2 | AC#4 cleanup; touches only archive/issue-N folders; disjoint from guard logic; separate commits |

### External Dependencies
- Node.js built-ins: `fs`, `os`, `path`, `child_process` (already imported in both scripts)
- No new npm packages needed

---

## Task List

### Task A1: Add `assertNoLiveWorkflowFolder` helper to sink-merge.js
- File: `scripts/kaola-workflow-sink-merge.js`
- Write Set: `scripts/kaola-workflow-sink-merge.js`
- Depends On: none
- Parallel Group: A (serial with A2)
- Action: MODIFY
- Implement: Insert after line 69 (closing brace of `assertCleanWorktree`), before line 71 (`// Steps 3–4:`):
  ```javascript
  function assertNoLiveWorkflowFolder(mainRoot, project) {
    const stateFile = path.join(mainRoot, 'kaola-workflow', project, 'workflow-state.md');
    if (fs.existsSync(stateFile)) {
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
- Mirror: `assertCleanWorktree` at lines 64–69 — same throw-not-exit pattern; caught by existing wrapper at line 272
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task A2: Wire guard call site in main()
- File: `scripts/kaola-workflow-sink-merge.js`
- Write Set: `scripts/kaola-workflow-sink-merge.js`
- Depends On: Task A1
- Parallel Group: A (serial with A1)
- Action: MODIFY
- Implement: Insert between lines 243–244 (after `execFileSync('git', ['-C', mainRoot, 'checkout', args.branch], ...)`, before `// Step 2 — Merge-base skip-check`):
  ```javascript
    assertNoLiveWorkflowFolder(mainRoot, args.project);
  ```
  Note: cwd is `os.tmpdir()` at this point; `mainRoot` is the absolute path from `mainRootFromCoord(getCoordRoot())`.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task B1: Add `testSinkMergeRefusesLiveFolder` (negative test)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task A2
- Parallel Group: B (parallel with B2, C1)
- Action: MODIFY
- Implement: Insert new function after line 1084 (end of `testE2EGitHubMergeFullChain`). Use issue number 910. OFFLINE-only (no gh shim needed). Pattern:
  1. `initGitRepo(tmp)`
  2. `spawnSync('git', ['checkout', '-b', 'workflow/issue-910'], { cwd: tmp })`
  3. `fs.mkdirSync(path.join(tmp, 'kaola-workflow', 'issue-910'), { recursive: true })`
  4. `fs.writeFileSync(path.join(tmp, 'kaola-workflow', 'issue-910', 'workflow-state.md'), 'status: active\n')`
  5. `spawnSync('git', ['add', 'kaola-workflow/'], { cwd: tmp })` + `spawnSync('git', ['commit', '-m', 'feat: issue 910'], { cwd: tmp })` — folder must be committed (in branch HEAD, not just working tree, to survive `assertCleanWorktree` on checkout)
  6. `spawnSync('git', ['checkout', 'main'], { cwd: tmp })`
  7. Capture `mainBefore = spawnSync('git', ['rev-parse', 'main'], { cwd: tmp, encoding: 'utf8' }).stdout.trim()`
  8. `result = spawnSync(process.execPath, [sinkMergeScript, '--project', 'issue-910', '--branch', 'workflow/issue-910'], { cwd: tmp, env: { ...process.env, KAOLA_WORKFLOW_OFFLINE: '1' }, encoding: 'utf8' })`
  9. `assert(result.status !== 0, 'sink-merge must fail when live folder present')`
  10. `assert(result.stderr.includes('finalize before sink-merge'), ...)`
  11. `assert(spawnSync('git', ['rev-parse', 'main'], ...).stdout.trim() === mainBefore, 'main SHA must be unchanged')`
  12. `console.log('testSinkMergeRefusesLiveFolder: PASSED')`
  - Note: `removeWorktree` in Step 0 of sink-merge is try/catch-wrapped (line 234) — safe when no worktree registered. `--issue` is optional (parseArgs only sets it when present).
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task B2: Add `testFastE2EMergeFullChain` (positive E2E test)
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task A2
- Parallel Group: B (parallel with B1, C1)
- Action: MODIFY
- Implement: Insert new function after `testSinkMergeRefusesLiveFolder`. Use issue number 851. Mirror `testE2EGitHubMergeFullChain` (lines 1014–1084) with these differences:
  - `writeGhShimForStartup(binDir)` — same gh shim (startup uses `issue view`)
  - `runClaimOnline(['startup', '--target-issue', '851'], tmp, binDir, { KAOLA_PATH: 'fast' })` — add `KAOLA_PATH: 'fast'` extraEnv
  - After startup, before the feature commit: write `fast-summary.md` to the linked worktree's project folder (`path.join(wt851, 'kaola-workflow', 'issue-851', 'fast-summary.md')`)  
  - Same worktree-finalize → `finalize --keep-worktree` → sink-merge chain
  - Same assertions as testE2EGitHubMergeFullChain, plus:
    - `assert(fs.existsSync(path.join(wt851, 'kaola-workflow', 'archive', 'issue-851', 'fast-summary.md')), 'fast-summary.md must be preserved in archive')`
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task B3: Register new tests in main()
- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Tasks B1 + B2
- Parallel Group: B (serial with B1+B2)
- Action: MODIFY
- Implement: After line 1291 (`testE2EGitHubMergeFullChain();`), before line 1292 (`testE2EGitHubPrFullChain();`), insert:
  ```javascript
    testSinkMergeRefusesLiveFolder();
    testFastE2EMergeFullChain();
  ```
- Validate: `node scripts/simulate-workflow-walkthrough.js`

### Task C1: Phase6.md guard documentation
- File: `commands/kaola-workflow-phase6.md`
- Write Set: `commands/kaola-workflow-phase6.md`
- Depends On: none
- Parallel Group: B+C (parallel with B1, B2)
- Action: MODIFY
- Implement: In step 8b section (lines 489–523), locate the paragraph beginning with the `sink: merge` finalize instruction. Append one sentence: `sink-merge will refuse with exit 1 if kaola-workflow/{project}/workflow-state.md is still present on the branch HEAD when it runs; this is a safety guard that ensures finalize always precedes the merge.`
- Validate: `grep -n "refuse with exit 1" commands/kaola-workflow-phase6.md`

### Task D1: Validation
- Depends On: Tasks A1, A2, B1, B2, B3, C1
- Action: RUN
- Command: `node scripts/simulate-workflow-walkthrough.js`
- Expected: exit 0, prints `Workflow walkthrough simulation passed`

### Task E1: AC#4 cleanup commit 1 — archive issue-101
- File: `kaola-workflow/issue-101/` (tracked deletions), `kaola-workflow/archive/issue-101/`
- Write Set: `kaola-workflow/issue-101/`, `kaola-workflow/archive/issue-101/`
- Depends On: none (independent)
- Parallel Group: E (separate commit)
- Action: MODIFY
- Implement:
  ```bash
  git rm -r kaola-workflow/issue-101/
  git add kaola-workflow/archive/issue-101/
  git commit -m "chore: archive issue-101 workflow folder"
  ```
  Note: pre-commit hook will pass (single project staged after archive/ exclusion).
- Validate: `git log --oneline -1` shows chore commit; `ls kaola-workflow/` no longer shows `issue-101/`

### Task E2: AC#4 cleanup commit 2 — archive issue-100
- File: `kaola-workflow/issue-100/` (live, needs rm), `kaola-workflow/archive/issue-100/`
- Write Set: `kaola-workflow/issue-100/`, `kaola-workflow/archive/issue-100/`
- Depends On: Task E1 (sequential to avoid hook trigger)
- Parallel Group: E (separate commit after E1)
- Action: MODIFY
- Implement:
  ```bash
  git rm -r kaola-workflow/issue-100/
  git add kaola-workflow/archive/issue-100/
  git commit -m "chore: archive issue-100 workflow folder"
  ```
  Note: `rm -rf kaola-workflow/issue-100/` is NOT used because `git rm -r` is required to stage the removal for the commit. E1 first ensures only one project is staged per commit.
- Validate: `git log --oneline -2` shows both chore commits; `ls kaola-workflow/` shows neither `issue-100/` nor `issue-101/`

---

## Advisor Notes
- Blueprint approved. Three issues resolved:
  1. AC#4 split into two commits — pre-commit hook blocks `PROJECT_COUNT > 1`
  2. `removeWorktree` confirmed no-op-tolerant (try/catch-wrapped at sink-merge.js:234); negative test safe
  3. `--issue` is optional in sink-merge; negative test omits it correctly
- Line numbers verified by reading actual file contents: helper after line 69, call site after line 243, new functions after line 1084, registration after line 1291.
- See `.cache/advisor-plan.md` for full advisory.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | .cache/advisor-plan.md corrections applied inline | Advisor issues resolved inline without full re-architect; corrections are factual (line numbers, split commits) not structural |
