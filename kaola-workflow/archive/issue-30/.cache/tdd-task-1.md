# TDD Evidence: Tasks 1+2+7 — coordRoot lock/session path migration

## Summary

Lock, session, and ticker PID files moved from `<root>/kaola-workflow/.locks|.sessions|.tickers`
to `<coordRoot>/kaola-workflow/.locks|.sessions|.tickers` where
`coordRoot = path.resolve(root, git rev-parse --git-common-dir)`.

This enables lock files to be shared across git worktrees, since all worktrees share
the same `.git/` directory.

---

## RED Phase — Tests written first, confirmed failing

Test file: `scripts/simulate-workflow-walkthrough.js`

Changes made before any implementation:
- Added `coordRootFor(dir)`, `locksDirFor(dir)`, `sessionsDirFor(dir)`, `tickersDirFor(dir)` helpers at top of file
- Updated ALL lock/session/ticker path assertions throughout Epics 1, 6, 7, 8, 9, 10, 12, 13, 14 to use the new helpers
- Added coordroot precursor sub-case (after Epic 14) verifying that primary and linked worktrees resolve the same coordRoot
- Added migration sub-case verifying `migrateLegacyCoordState` moves legacy files to coordRoot on first claim

RED confirmation output (before claim.js changes):
```
Error: Epic Case 1: lock file must exist after claim
```
Exit code: 1

---

## GREEN Phase — Minimal implementation, tests pass

Files modified:

### scripts/kaola-workflow-claim.js
- Added `getCoordRoot()` using `git rev-parse --git-common-dir` resolved to absolute path.
  Includes comment explaining macOS symlink behavior (/var -> /private/var) and why
  fs.realpathSync is not needed in production (coordRoot only used for filesystem I/O, not
  string equality comparisons across processes).
- Updated path helpers: `locksDir(coordRoot)`, `sessionsDir(coordRoot)`, `lockPath(coordRoot, project)`,
  `sessionPath(coordRoot, sessionId)`, `tickerPidPath(coordRoot, sessionId)`, `startupReceiptPath(coordRoot, sessionId)`
- Added `migrateLegacyCoordState(root, coordRoot)` using `fs.linkSync` with EEXIST/EXDEV handling
- Added `readJsonFileWithFallback(newPath, legacyPath)` for backward-compatible reads
- Updated `readLockFiles(coordRoot, root)` with deduplication via Set (keyed on filename, not full path)
- Updated all cmd functions to call `getCoordRoot()` and thread `coordRoot` through all operations
- Removed 3-attempt EEXIST retry loop in `cmdClaim`, replaced with single O_EXCL write + clean error

### scripts/kaola-workflow-classifier.js
- Added `getCoordRoot()` (same pattern)
- Updated `readLockFiles(coordRoot, root)` with deduplication
- Updated `cmdClassify` to use coordRoot

### scripts/kaola-workflow-sink-pr.js
- Added `getCoordRoot()`
- Updated `locksDir(coordRoot)`, `lockPath(coordRoot, project)`, `patchLockFile(coordRoot, ...)`
- Updated `main()` to call `getCoordRoot()` and pass coordRoot to patchLockFile

---

## GREEN confirmation output

```
Workflow walkthrough simulation passed
```
Exit code: 0, achieved pass^3 (5 consecutive runs all green)

---

## Coordroot precursor test

Validates that `getCoordRoot()` / `coordRootFor()` produces the same canonical path
from both a primary worktree and a linked (detached) worktree:

```javascript
execFileSync('git', ['init', '-b', 'main'], { cwd: coordTmp });
execFileSync('git', ['-C', coordTmp, 'commit', '--allow-empty', '-m', 'init']);
const linkedPath = coordTmp + '-linked';
execFileSync('git', ['-C', coordTmp, 'worktree', 'add', '--detach', linkedPath, 'HEAD']);
const mainCoordRoot = fs.realpathSync(coordRootFor(coordTmp));
const linkedCoordRoot = fs.realpathSync(coordRootFor(linkedPath));
assert(mainCoordRoot === linkedCoordRoot);   // both resolve to same .git dir
assert(path.isAbsolute(mainCoordRoot));
assert(mainCoordRoot.endsWith('.git'));
assert(mainCoordRoot !== fs.realpathSync(linkedPath));
```

macOS note: `/var` symlinks to `/private/var`; `fs.realpathSync` is used in test assertions
to normalize paths before comparison. Production `getCoordRoot()` does NOT need realpathSync —
all uses are filesystem I/O (path.join + fs calls), never string equality across processes.

---

## Migration test

Validates that `migrateLegacyCoordState` moves files from `<root>/kaola-workflow/.locks`
to `<coordRoot>/kaola-workflow/.locks` on first `claim` invocation:

- Creates legacy lock file at `<tmp>/kaola-workflow/.locks/mig-proj.lock`
- Runs `claim` for a new project (triggers migration)
- Asserts legacy path is gone, new coordRoot path exists with correct content
- Asserts new claim lock also written to coordRoot

---

## Files changed

- `scripts/simulate-workflow-walkthrough.js` — test helper additions, path assertion updates, coordroot/migration tests
- `scripts/kaola-workflow-claim.js` — coordRoot threading, migration, O_EXCL atomicity, macOS comment
- `scripts/kaola-workflow-classifier.js` — coordRoot threading
- `scripts/kaola-workflow-sink-pr.js` — coordRoot threading
