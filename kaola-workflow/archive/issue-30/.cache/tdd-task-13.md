# TDD Task 13 (PR2-B-sm) — Worktree Removal in postMergeCleanup

## Summary

Modified `scripts/kaola-workflow-sink-merge.js` to remove the worktree before deleting the feature branch in `postMergeCleanup`.

## Changes Made

### File: `scripts/kaola-workflow-sink-merge.js`

**Step 1 — Added import at top of file:**
```javascript
const { getCoordRoot, removeWorktree } = require('./kaola-workflow-claim.js');
```
Added after the existing `child_process` require. The local `getRoot()` function was left intact — it serves a different purpose (git toplevel for the current repo context). `getCoordRoot` from claim.js resolves the coordination root where lock files are stored.

**Step 2 — Wired `removeWorktree` into `postMergeCleanup` (Step 9):**
Before the `git branch -d` call, added:
```javascript
const coordRoot = getCoordRoot();
const lockFilePath = path.join(coordRoot, 'kaola-workflow', '.locks', args.project + '.lock');
let lock = null;
try { lock = JSON.parse(fs.readFileSync(lockFilePath, 'utf8')); } catch (_) {}
if (lock) { try { removeWorktree(coordRoot, args.project, lock); } catch (_) {} }
```

`args.project` is available because `parseArgs` populates it from `--project` and `main()` asserts it is a safe name before calling `postMergeCleanup`. Both `path` and `fs` were already required at the top of the file.

## TDD Verification

- **Before change:** `node scripts/simulate-workflow-walkthrough.js` — exit 0, "Workflow walkthrough simulation passed"
- **After change:** `node scripts/simulate-workflow-walkthrough.js` — exit 0, "Workflow walkthrough simulation passed"

## Notes

- All error paths are swallowed with `try/catch` to match the defensive style used throughout `postMergeCleanup`. A missing or unparseable lock file is silently skipped; `removeWorktree` failures are similarly suppressed so they cannot block branch deletion.
- No other files were modified.
