# Code Architect Output — Issue #105

## Design Decisions

1. Guard placement AFTER `git checkout args.branch` (line 243) and BEFORE rebase — main worktree HEAD reflects branch state at guard time; placing before checkout would produce false positives.
2. Helper throws (not `process.exit`); existing `try { main() } catch` wrapper at line 272 converts to exit 1 + stderr.
3. Stable test substring: error message embeds the literal phrase "finalize before sink-merge" for grep-stable test assertions.
4. Remediation message lists both paths: Path A (worktree available, run finalize) and Path B (worktree gone, git rm and recommit).
5. No new file: helper is a function in `sink-merge.js`, not a new module.
6. AC#4 cleanup is a separate commit from guard logic + tests + doc edit.

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-sink-merge.js` | Add `assertNoLiveWorkflowFolder(mainRoot, project)` helper after line 69; wire call site between lines 243–244 | P0 |
| `scripts/simulate-workflow-walkthrough.js` | Add `testSinkMergeRefusesLiveFolder` and `testFastE2EMergeFullChain`; register both in `main()` near line 1291 | P0 |
| `commands/kaola-workflow-phase6.md` | One-sentence addition in step 8b (lines 489–523) noting sink-merge will refuse if live folder present | P1 |

## Files to Create
None.

## Data Flow

```
sink-merge main()
  └─ Step 0: removeWorktree (cwd → os.tmpdir())
  └─ Step 1: git fetch origin [skipped if OFFLINE]
  └─ assertCleanWorktree(mainRoot)           ← existing guard (line 67)
  └─ git checkout args.branch                ← line 243 (existing)
  └─ assertNoLiveWorkflowFolder(mainRoot, args.project)  ← NEW (after checkout)
  └─ Step 2: merge-base skip-check
  └─ doRebase(...)
  └─ ffMergeLoop(...)
  └─ postMergeCleanup(...)
```

## Build Sequence

### Step 1 — Add helper to sink-merge.js (after line 69)

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

### Step 2 — Wire call site in main() between lines 243–244

```javascript
  assertNoLiveWorkflowFolder(mainRoot, args.project);
```

### Step 3 — Add `testSinkMergeRefusesLiveFolder` (OFFLINE, negative test)

Use issue number 910 (avoids collision with existing 850, 860, 870, 871 test numbers).

Sequence:
1. `initGitRepo(tmp)` — git repo with `main` branch
2. `git checkout -b workflow/issue-910`
3. Write `kaola-workflow/issue-910/workflow-state.md` with `status: active`
4. `git add kaola-workflow/` + `git commit` — folder must be in branch HEAD (not just working tree, or assertCleanWorktree would refuse)
5. `git checkout main`
6. Capture `git rev-parse main` SHA as `mainBefore`
7. Run sink-merge with `KAOLA_WORKFLOW_OFFLINE=1`; assert non-zero exit, stderr includes "finalize before sink-merge", main SHA unchanged

### Step 4 — Add `testFastE2EMergeFullChain` (online, positive E2E)

Use issue number 851 (distinct from 850). Mirror `testE2EGitHubMergeFullChain` with:
- `{ KAOLA_PATH: 'fast' }` extraEnv on startup call
- Write `fast-summary.md` into linked worktree project folder (simulates fast-path agent artifact)
- Same worktree-finalize, `finalize --keep-worktree`, and sink-merge structure as full-path test
- Additional assertion: `kaola-workflow/archive/issue-851/fast-summary.md` exists (fast artifact preserved in archive)

### Step 5 — Register both tests in main()

After `testE2EGitHubMergeFullChain()` near line 1291:
```javascript
    testSinkMergeRefusesLiveFolder();
    testFastE2EMergeFullChain();
```

### Step 6 — Phase6.md doc edit (parallelizable with Steps 1–5)

In step 8b section (lines 489–523), at the end of the `sink: merge` paragraph, add:
> `sink-merge` will refuse with exit 1 if `kaola-workflow/{project}/workflow-state.md` is still present on the branch HEAD when it runs; this is a safety guard that ensures finalize always precedes the merge.

### Step 7 — Validate

```
node scripts/simulate-workflow-walkthrough.js
```

Must exit 0 and print `Workflow walkthrough simulation passed`.

### Step 8 — AC#4 cleanup commit (independent, separate commit)

```bash
git rm -r kaola-workflow/issue-101/          # stages the three tracked deletions
rm -rf kaola-workflow/issue-100/             # removes live folder (archive already exists)
git add kaola-workflow/archive/issue-100/ kaola-workflow/archive/issue-101/
# commit: "chore: archive issue-100 and issue-101 workflow folders"
```

## Task List with Parallelization Groups

**Group A — guard implementation (serial)**
- A1: Add `assertNoLiveWorkflowFolder` helper to `sink-merge.js` after line 69
- A2: Wire call site in `main()` between lines 243–244 (depends on A1)

**Group B — tests (serial, depends on A2 for testable behavior)**
- B1: Add `testSinkMergeRefusesLiveFolder` to walkthrough
- B2: Add `testFastE2EMergeFullChain` to walkthrough (independent of B1)
- B3: Register both in `main()` (depends on B1 and B2)

**Group C — doc (parallelizable with A and B)**
- C1: Add one sentence to phase6.md step 8b

**Group D — validate (depends on A+B+C)**
- D1: Run `node scripts/simulate-workflow-walkthrough.js`

**Group E — AC#4 cleanup (fully independent, separate commit)**
- E1–E4: git rm / rm -rf / git add / commit

## Key File Line References

- `kaola-workflow-sink-merge.js`: helper after line 69; call site between lines 243–244
- `simulate-workflow-walkthrough.js`: new tests after line 1084; registration near line 1291
- `kaola-workflow-phase6.md`: one-sentence addition inside step 8b paragraph (~line 509–511)
