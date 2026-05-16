# TDD Task 16 (PR2-D) — Epic Cases 15 and 16

## What Was Done

### Test Code Inserted

Epic Cases 15 and 16 were inserted into `scripts/simulate-workflow-walkthrough.js` between the closing `}` of Epic Case 14 and the `// LOW-3:` comment, per the task specification.

The `readLockFileViaPath` helper was added alongside the existing `coordRootFor`, `locksDirFor`, `sessionsDirFor`, and `tickersDirFor` helpers near the top of the file.

### Additional Fix Applied: coordRootFor Symlink Normalization

The pre-existing `coordRootFor` helper (added in a prior task) had a macOS-specific bug: on macOS, `/var/folders` is a symlink to `/private/var/folders`. When `git rev-parse --git-common-dir` is called from the primary worktree, it returns the relative `.git` which resolves to `/var/folders/...`. When called from a linked worktree, git resolves symlinks internally and returns the absolute `/private/var/folders/...` path. The two strings differed, causing 15C's equality assertion to fail.

Fix applied to `coordRootFor`:
```javascript
function coordRootFor(dir) {
  try {
    const raw = execFileSync('git', ['rev-parse', '--git-common-dir'],
      { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const resolved = path.resolve(dir, raw);
    try { return fs.realpathSync(resolved); } catch (_) { return resolved; }
  } catch (_) {
    return path.join(dir, '.git');
  }
}
```

15C passed after this fix.

## Test Run Results

### RED Phase

Ran `node scripts/simulate-workflow-walkthrough.js` immediately after inserting tests (before symlink fix). Failed at 15C with path mismatch due to macOS symlink issue.

After applying the `coordRootFor` symlink fix: 15A and 15C pass. 15D fails.

### GREEN Phase — BLOCKED by Implementation Gap

The full test suite does NOT exit 0. The run aborts at **15D (AC4)** with exit code 2.

#### Observed Failure: 15D (AC4)

**Assertion:** Same-session re-claim of the same project/issue must reuse the existing worktree and return exit 0.

**Actual behavior:** `kaola-workflow-claim.js cmdClaim` exits 2.

**Root cause:** In `scripts/kaola-workflow-claim.js`, function `cmdClaim` (line 1103):

```javascript
// Line 1115: this check runs BEFORE resume-detection
if (args.issue != null && issueAlreadyClaimed(coordRoot, root, args.issue)) {
  process.exitCode = 2;
  return;
}

// Line 1123-1144: resume-detection (same-session re-claim) — never reached
const existingLock = readJsonFile(lp);
if (existingLock && existingLock.session_id === args.session) {
  if (existingLock.worktree_path && fs.existsSync(existingLock.worktree_path)) {
    // AC4: reuse existing worktree — NEVER REACHED
    ...
    return;
  }
```

`issueAlreadyClaimed` (line 330) scans all lock files and returns true if ANY lock has `issue_number === issue`. When session `sess-15a` owns `issue-501.lock` with `issue_number: 501`, a re-claim for the same session+project+issue triggers the guard and exits 2 before reaching the resume logic.

**Status:** Test is correct per spec. Implementation gap in `scripts/kaola-workflow-claim.js` blocks GREEN. This task (PR2-D, test insertion) is complete; a separate task is required to fix the resume-detection ordering before the full suite can pass.

**Proposed fix (out of scope for this task):** Either:
1. Move the `issueAlreadyClaimed` guard to AFTER the resume-detection block at lines 1124-1143, OR
2. Modify `issueAlreadyClaimed` to exempt the case where the existing lock for the SAME project belongs to the SAME session:
   ```javascript
   function issueAlreadyClaimed(coordRoot, root, issue, exemptProject, exemptSession) {
     return readLockFiles(coordRoot, root).some(lock =>
       lock.issue_number === issue &&
       !(lock.project === exemptProject && lock.session_id === exemptSession)
     ) || activeStateIssueNumbers(root).has(issue);
   }
   ```

#### Tests 15E, 15F, 16A–16H

Not yet exercised — the test run aborts at 15D. Their correctness depends on the same implementation gap being resolved first.

## Files Modified

- `scripts/simulate-workflow-walkthrough.js` — inserted Epic Cases 15 and 16 per spec, added `readLockFileViaPath` helper, fixed `coordRootFor` symlink normalization

## Files NOT Modified

- `scripts/kaola-workflow-claim.js` — outside task write set; implementation gap identified above

## Next Step

Fix the `issueAlreadyClaimed` / resume-detection ordering bug in `scripts/kaola-workflow-claim.js`, then re-run `node scripts/simulate-workflow-walkthrough.js` to discover if further gaps exist.
