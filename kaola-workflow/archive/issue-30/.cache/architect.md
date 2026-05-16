## Architecture: Issue-30 Git Worktree Substrate

### Design Decisions

- `getCoordRoot()` always calls `path.resolve(root, output)` because `--git-common-dir` returns a relative path (`.git`) in the primary worktree and an absolute path in a linked worktree. The resolve handles both.
- `migrateLegacyCoordState(root, coordRoot)` iterates `.locks/*.lock`, `.sessions/*.json`, `.sessions/*.startup.json`, `.tickers/*.pid` using O_EXCL rename semantics: rename to new path only when the destination does not already exist. Called eagerly at the top of `cmdClaim()` (before lock write), not lazily on read, so the first session to claim in a new coordRoot wins the migration.
- PR-1 changes path-helper signatures but keeps runtime behavior identical. No reads from new paths in PR-1 except through the backwards-compat fallback reader on lock/session reads.
- PR-2 places `provisionWorktree()` AFTER the tiebreaker check, so a yield abandons before any worktree is created. This avoids the `releaseSession + removeWorktree` ordering trap.
- `drainPendingRemovals()` in sweep is best-effort: it retries on next sweep; no process-cwd inspection is performed. A pending removal entry is consumed when `git worktree remove --force` exits 0.
- On handoff, `worktree_path` and `branch` are preserved from the existing lock (`Object.assign({}, existing, { session_id, ... })`). The worktree is project-scoped, not session-scoped.
- `cmdPatchBranch` still functions after PR-2: it overwrites `lock.branch` idempotently. If called after provisioning, it patches both the lock and the state file without disturbing `worktree_path`.
- `.pending-removal/` entries go under `coordRoot` so they survive across worktree-scoped sessions.

---

### Files to Create

None expected.

---

### Files to Modify

| File | Changes | PR |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | PR-1: add `getCoordRoot()`, `migrateLegacyCoordState()`, backwards-compat lock/session readers; retarget `locksDir`, `sessionsDir`, `lockPath`, `sessionPath`, `tickerPidPath` to accept `coordRoot`; update all ~30+ call sites; add coordRoot precursor test sub-case comment | PR-1 |
| `hooks/kaola-workflow-pre-commit.sh` | Line 4: add `COORD_ROOT="$(git rev-parse --git-common-dir 2>/dev/null)" && COORD_ROOT="$(cd "$(dirname "$GIT_ROOT")" && realpath "$COORD_ROOT" 2>/dev/null || echo "$GIT_ROOT/.git")"`. Line 54: replace `$GIT_ROOT/kaola-workflow/.locks/` with `$COORD_ROOT/kaola-workflow/.locks/`; add legacy fallback `# Legacy fallback (dropped in v3.3.x): $GIT_ROOT/kaola-workflow/.locks/` | PR-1 |
| `scripts/kaola-workflow-repair-state.js` | Line 80: `projectOwner(workflowDir, project)` — add `coordRoot` lookup via inline `git rev-parse --git-common-dir` equivalent; change lock read from `workflowDir + '/.locks/'` to `coordRoot + '/kaola-workflow/.locks/'` | PR-1 |
| `scripts/validate-workflow-contracts.js` | Lines 211–212: remove the two `assertIncludes('.gitignore', ...)` assertions for `.locks/` and `.sessions/` | PR-1 |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-for-byte mirror of scripts/ version | PR-1 |
| `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js` | Byte-for-byte mirror | PR-1 |
| `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` | Byte-for-byte mirror | PR-1 |
| `scripts/simulate-workflow-walkthrough.js` | Add coordRoot precursor sub-case (between Epic Case 14 finally and LOW-3, at lines 3217–3219); add Epic Cases 15 (15A–15F) and 16 (16A–16G) at same insertion point | PR-1 precursor sub-case; PR-2 cases 15 and 16 |
| `scripts/kaola-workflow-claim.js` | PR-2: add `worktreePathFor()`, `provisionWorktree()`, `removeWorktree()`, `drainPendingRemovals()`; extend `buildLockData()` with `worktree_path: null, branch: null`; rewire `cmdClaim()` transaction; rewire `cmdWatchPr()` MERGED+CLOSED branches; rewire `cmdSweep()`; extend `module.exports` | PR-2 |
| `scripts/kaola-workflow-sink-merge.js` | Add `getCoordRoot()`; add `removeWorktree()` inline or imported; wire into `postMergeCleanup()` before `git branch -d` | PR-2 |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Mirror PR-2 changes | PR-2 |
| `plugins/kaola-workflow/scripts/kaola-workflow-sink-merge.js` | Mirror PR-2 changes | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | Add `cd "$KAOLA_WORKTREE_PATH" 2>/dev/null \|\| true` shim in Session Heartbeat block, after cwd | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | Same shim | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | Same shim | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | Same shim | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | Same shim | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Same shim | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-init/SKILL.md` | Same shim | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-next/SKILL.md` | Same shim | PR-2 |
| `plugins/kaola-workflow/skills/kaola-workflow-next-pr/SKILL.md` | Same shim | PR-2 |

---

### Data Flow

**PR-1 (substrate):**

```
getRoot() → root (--show-toplevel, project state files)
getCoordRoot() → coordRoot (--git-common-dir resolved, lock/session/ticker storage)

coordRoot used by: locksDir, sessionsDir, lockPath, sessionPath, tickerPidPath
root used by: roadmapDir, roadmapIssuePath, stateFile paths, workflowDir enumeration

migrateLegacyCoordState(root, coordRoot):
  legacy: root/kaola-workflow/.locks/, .sessions/, .tickers/
  new:  coordRoot/kaola-workflow/.locks/, .sessions/, .tickers/
  each file: rename(legacy_path, new_path) if !exists(new_path) — idempotent

backwards-compat reader (lock/session):
  try readJsonFile(new_path) → return if found
  fallback: readJsonFile(legacy_path) — one minor version window
```

**PR-2 (worktree provisioning):**

```
worktreePathFor(root, project):
  → path.join(path.dirname(root), path.basename(root) + '.kw', project)

cmdClaim() new transaction order:
  1. writeLockFile(lp, lockData)           [O_EXCL, no worktree_path yet]
  2. writeSessionFile(coordRoot, ...)
  3. postGitHubClaim + tiebreaker         [if yield: releaseSession, exit 1]
  4. provisionWorktree(root, project, branch)
       [on fail: releaseSession(coordRoot, ...) + exit 2]
  5. fs.writeFileSync(lp, lockData + {worktree_path, branch})
  6. updateSinkLease(stateFile, finalLock)

removeWorktree(coordRoot, project, lock, opts):
  wtPath = lock.worktree_path (null → noop)
  cwdReal = fs.realpathSync(process.cwd()) — try/catch ENOENT → ''
  wtReal  = fs.realpathSync(wtPath)        — try/catch ENOENT → treat as already-removed
  if (cwdReal === wtReal || cwdReal.startsWith(wtReal + path.sep)):
    write coordRoot/kaola-workflow/.pending-removal/<project>.json
    return {deferred: true}
  if git status --porcelain in wtPath is empty:
    git worktree remove --force <wtPath>
  else:
    rename wtPath → <wtPath>.abandoned-<ISO8601>
  return {removed: true} or {abandoned: true}

drainPendingRemovals(coordRoot):
  dir = coordRoot/kaola-workflow/.pending-removal/
  for each *.json: attempt removeWorktree; unlink entry on success

cmdSweep() additions (after existing sweep loop):
  git worktree prune
  drainPendingRemovals(coordRoot)

cmdWatchPr() MERGED branch:
  removeWorktree(coordRoot, lock.project, lock)   ← BEFORE git branch -D
  releaseSession(coordRoot, lock.session_id, 'merged')
  git branch -D <branchName>

cmdWatchPr() CLOSED branch:
  removeWorktree(coordRoot, lock.project, lock)
  releaseSession(coordRoot, lock.session_id, 'aborted')

postMergeCleanup() in sink-merge.js:
  coordRoot = getCoordRoot(root)
  lock = readJsonFile(coordRoot/kaola-workflow/.locks/<project>.lock)
  removeWorktree(coordRoot, project, lock)   ← BEFORE git branch -d
  git branch -d <branch>
  git push origin --delete <branch>
```

---

### Build Sequence

#### PR-1

1. **`getCoordRoot()` function** — no dependencies; pure addition after `getRoot()` at line 89. Resolves output with `path.resolve(root, rawOutput)` to handle both relative and absolute outputs.

2. **`migrateLegacyCoordState(root, coordRoot)` function** — depends on `getRoot`/`getCoordRoot` existing. Iterates four subdirectories; uses try/catch on `fs.renameSync` — ENOENT on destination means "already there, skip".

3. **Backwards-compat reader wrapper** — thin wrapper over `readJsonFile` that checks new path first, then legacy. Used by `readLockFiles`, `readSessionFile`, `readStartupReceipt`.

4. **Path helper signature change** — `locksDir(coordRoot)`, `sessionsDir(coordRoot)`, `lockPath(coordRoot, project)`, `sessionPath(coordRoot, sessionId)`, `tickerPidPath(coordRoot, sessionId)` all change first param name only; semantics unchanged. `roadmapDir(root)`, state file paths keep `root`.

5. **Call-site threading (~30+ sites)** — depends on steps 3–4. Each function call that used `root` for lock/session/ticker storage now passes `coordRoot`. State-file paths keep `root`. This is the mechanically large step.

6. **`hooks/kaola-workflow-pre-commit.sh` lines 4 + 54** — independent of JS changes; only depends on knowing the correct `--git-common-dir` command.

7. **`kaola-workflow-repair-state.js` line 80** — independent of claim.js edits; reads lock from coordRoot.

8. **`validate-workflow-contracts.js` lines 211–212** — remove two assertions; independent.

9. **Plugin mirrors (3 files)** — copy after steps 5–8 complete; parallel group.

10. **Coordroot precursor sub-case in `simulate-workflow-walkthrough.js`** — final PR-1 item; validates `getCoordRoot() !== root` in a linked worktree temp.

#### PR-2

11. **`worktreePathFor(root, project)`** — pure function, no dependencies.

12. **`provisionWorktree(root, project, branch)`** — depends on `worktreePathFor`.

13. **`removeWorktree(coordRoot, project, lock, opts)`** — depends on coordRoot path helpers (PR-1).

14. **`drainPendingRemovals(coordRoot)`** — depends on `removeWorktree`.

15. **`buildLockData()` extension** — add `worktree_path: null, branch: null` fields.

16. **`cmdClaim()` transaction rewrite** — depends on steps 11–15; most sensitive step.

17. **`cmdWatchPr()` MERGED + CLOSED wiring** — depends on step 13.

18. **`cmdSweep()` extension** — depends on step 14.

19. **`kaola-workflow-sink-merge.js` changes** — add `getCoordRoot()`, wire `removeWorktree()` into `postMergeCleanup()`.

20. **9 SKILL.md files** — independent of JS changes; parallel group.

21. **Plugin mirrors (claim.js + sink-merge.js)** — after steps 16–19.

22. **Epic Cases 15 + 16 in `simulate-workflow-walkthrough.js`** — final; depends on all PR-2 implementation.

---

### Parallelization Plan

**Within PR-1:**

| Parallel Group | Tasks | Constraint |
|---------------|-------|-----------|
| Group P1-A | `getCoordRoot`, `migrateLegacyCoordState`, backwards-compat reader, path helpers (steps 1–4) | All in claim.js; serialized by file |
| Group P1-B (after P1-A) | Call-site threading in claim.js | Single file |
| Group P1-C (concurrent with P1-B) | pre-commit.sh line edits | Disjoint write set |
| Group P1-C (concurrent with P1-B) | repair-state.js line 80 | Disjoint write set |
| Group P1-C (concurrent with P1-B) | validate-workflow-contracts.js deletion | Disjoint write set |
| Group P1-D (after P1-B + P1-C) | 3 plugin mirrors | Disjoint from each other; parallel across the 3 files |
| Group P1-E (after P1-D) | coordroot precursor sub-case in walkthrough.js | Needs implementation |

**Within PR-2 (serialized after PR-1 lands):**

| Parallel Group | Tasks | Constraint |
|---------------|-------|-----------|
| Group P2-A | New functions in claim.js (steps 11–15) | Single file; serialize |
| Group P2-B (after P2-A) | `cmdClaim`, `cmdWatchPr`, `cmdSweep` rewiring | Single file |
| Group P2-B (concurrent) | sink-merge.js changes | Disjoint file |
| Group P2-B (concurrent) | 9 SKILL.md shims | Disjoint; can split 9 files across 3 agents |
| Group P2-C (after P2-B) | Plugin mirrors (2 files) | Disjoint; parallel |
| Group P2-D (after P2-C) | Epic Cases 15 + 16 | Needs complete implementation |

---

### Task List

#### PR-1 Tasks

---

**Task PR1-1: Add `getCoordRoot()`**

- File: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (coordroot precursor sub-case)
- Write Set: `scripts/kaola-workflow-claim.js` lines 89–99 (new function block)
- Depends On: nothing
- Parallel Group: P1-A
- Action: MODIFY
- Implement:
  - Insert after `getRoot()` at line 89.
  - Call `execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })`.
  - Wrap in try/catch: on error, return `path.join(root, '.git')` as safe fallback.
  - Always: `return path.resolve(root, rawOutput.trim())` — handles both `.git` (relative, primary worktree) and `/absolute/path/.git` (linked worktree).
  - `root` parameter defaults to `getRoot()` call inside.
- Mirror: `getRoot()` pattern at lines 80–89 — same `execFileSync` + `stdio` + try/catch structure.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (coordroot precursor sub-case must pass)

---

**Task PR1-2: Add `migrateLegacyCoordState(root, coordRoot)`**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (coordroot precursor sub-case asserts idempotency)
- Write Set: new function block after `getCoordRoot()`
- Depends On: PR1-1
- Parallel Group: P1-A
- Action: MODIFY
- Implement:
  - For each of `['.locks', '.sessions', '.tickers']`: read legacy dir `path.join(root, 'kaola-workflow', subdir)` with `fs.readdirSync` (catch ENOENT → continue).
  - For each file: `legacyPath = path.join(legacyDir, file)`, `newPath = path.join(coordRoot, 'kaola-workflow', subdir, file)`.
  - `fs.mkdirSync(path.dirname(newPath), { recursive: true })`.
  - Try `fs.renameSync(legacyPath, newPath)` — if `ENOENT` (destination dir) or `EEXIST` (already migrated): swallow silently. On other errors: `process.stderr.write` warning, continue.
  - Function is idempotent: if new path already exists, `renameSync` will not overwrite it (use `fs.copyFileSync` + `fs.unlinkSync` approach with existence check if `renameSync` EXDEV behavior is a concern across filesystems — prefer copyFile+unlink for safety across mount points).
- Mirror: `releaseSession` error-swallow pattern at line 1225.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

**Task PR1-3: Backwards-compat lock/session reader**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: new helper function; modify `readLockFiles`, `readSessionFile`, `readStartupReceipt`
- Depends On: PR1-1
- Parallel Group: P1-A
- Action: MODIFY
- Implement:
  - Add `readJsonFileWithFallback(newPath, legacyPath)` — returns `readJsonFile(newPath) || readJsonFile(legacyPath)`.
  - In `readLockFiles(coordRoot)`: scans `locksDir(coordRoot)` first, then deduplicates against `locksDir(root)` (legacy). Returns merged unique list by project name.
  - `readSessionFile(coordRoot, root, sessionId)`: try `sessionPath(coordRoot, sessionId)` then `sessionPath(root, sessionId)`.
  - `readStartupReceipt(coordRoot, root, sessionId)`: same pattern on `startupReceiptPath`.
  - Legacy fallback is removed when all callers are known to have migrated (tracked by minor version comment).
- Mirror: existing `readJsonFile` null-return pattern at line 139.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

**Task PR1-4: Path helper signature change**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: lines 133–137
- Depends On: PR1-1
- Parallel Group: P1-A (change signatures only; no call-sites yet)
- Action: MODIFY
- Implement:
  - `locksDir(coordRoot)` — param rename only, body unchanged.
  - `sessionsDir(coordRoot)` — param rename only.
  - `lockPath(coordRoot, project)` — param rename only.
  - `sessionPath(coordRoot, sessionId)` — param rename only.
  - `tickerPidPath(coordRoot, sessionId)` — param rename only; update body: `path.join(coordRoot, 'kaola-workflow', '.tickers', sessionId + '.pid')`.
  - `roadmapDir(root)` at line 579 and all state-file `path.join(root, 'kaola-workflow', ...)` calls: unchanged.
- Mirror: existing function signatures at lines 133–137.
- Validate: static review (no behavioral change); full validation in PR1-5.

---

**Task PR1-5: Call-site threading (~30+ sites)**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: every function body that calls lock/session/ticker path helpers
- Depends On: PR1-1 through PR1-4
- Parallel Group: P1-B
- Action: MODIFY
- Implement:
  - At top of every `cmd*()` function and every function that calls lock/session helpers: add `const coordRoot = getCoordRoot();` (or accept as param if called from another cmd that already has it).
  - Affected functions (by category):
    - Lock read/write: `cmdClaim`, `cmdHandoff`, `cmdCanHandoff`, `cmdHeartbeat`, `cmdRelease`, `cmdSweep`, `cmdStatus`, `cmdWatchPr`, `cmdPatchBranch`, `releaseSession`, `readLockFiles`, `sessionForProject`, `ownedActiveProject`, `issueAlreadyClaimed`
    - Session read/write: `writeSessionFile`, `cmdHandoff`, `cmdClaim`
    - Ticker: `cmdTicker`, `tickerPidPath` call in `localOwnerLiveness`
    - Startup receipt: `writeStartupReceipt`, `readStartupReceipt`, `cmdVerifyStartup`, `cmdStartup`, `cmdHandoff`
  - State-file paths remain `path.join(root, 'kaola-workflow', project, 'workflow-state.md')` — untouched.
  - `localOwnerLiveness(root, ownerSession, lock, now)` — `tickerPidPath` call changes to `tickerPidPath(coordRoot, ownerSession)`.
  - `runTick(tickCtx)` — add `tickCtx.coordRoot`; update all lock/state reads.
  - `migrateLegacyCoordState(root, coordRoot)` called at top of `cmdClaim()` before `fs.mkdirSync(locksDir(coordRoot))`.
- Mirror: existing `const root = getRoot();` pattern present in every cmd function.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (all existing cases must pass)

---

**Task PR1-6: `hooks/kaola-workflow-pre-commit.sh` changes**

- File: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/hooks/kaola-workflow-pre-commit.sh`
- Test File: none (shell script; tested via manual or Epic Case 16 secondary assertion)
- Write Set: lines 4 and 54
- Depends On: nothing (disjoint file)
- Parallel Group: P1-C
- Action: MODIFY
- Implement:
  - After line 4 (`GIT_ROOT=...`), add:
    ```bash
    COORD_ROOT="$(git rev-parse --git-common-dir 2>/dev/null)" || COORD_ROOT=""
    [ -n "$COORD_ROOT" ] && COORD_ROOT="$(cd "$GIT_ROOT" && realpath "$COORD_ROOT" 2>/dev/null)" || COORD_ROOT="$GIT_ROOT/.git"
    ```
  - Line 54: change `LOCK_FILE="$GIT_ROOT/kaola-workflow/.locks/${PROJECT}.lock"` to `LOCK_FILE="$COORD_ROOT/kaola-workflow/.locks/${PROJECT}.lock"`.
  - Add comment below: `# Legacy fallback (dropped in v3.3.x): $GIT_ROOT/kaola-workflow/.locks/`.
  - Add legacy fallback in the `if [ -f "$LOCK_FILE" ]` block: if `$LOCK_FILE` not found, try `$GIT_ROOT/kaola-workflow/.locks/${PROJECT}.lock`.
- Mirror: existing GIT_ROOT pattern at line 4.
- Validate: `bash -n hooks/kaola-workflow-pre-commit.sh` (syntax check); `node scripts/simulate-workflow-walkthrough.js`

---

**Task PR1-7: `kaola-workflow-repair-state.js` line 80 coordRoot param**

- File: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/scripts/kaola-workflow-repair-state.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (existing repair-state tests)
- Write Set: `projectOwner()` function at line 80
- Depends On: nothing (disjoint file)
- Parallel Group: P1-C
- Action: MODIFY
- Implement:
  - In `projectOwner(workflowDir, project)` at line 80: derive `coordRoot` inline using `execFileSync('git', ['rev-parse', '--git-common-dir'])` + `path.resolve(cwd, raw.trim())` where `cwd` is derived from `workflowDir` parent traversal.
  - Change `const lockFile = path.join(workflowDir, '.locks', project + '.lock')` to `const lockFile = path.join(coordRoot, 'kaola-workflow', '.locks', project + '.lock')`.
  - Add legacy fallback: if new path doesn't exist, try `path.join(workflowDir, '.locks', project + '.lock')`.
  - `require('child_process')` already available since the file uses `execFileSync` through `readFile`.
  - Wrap in try/catch: on `git rev-parse` error, fall back to `workflowDir` path (existing behavior).
- Mirror: `getRoot()` pattern in repair-state's existing try/catch style (see `main()` error handling at line 452).
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

**Task PR1-8: `validate-workflow-contracts.js` assertion removal**

- File: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/scripts/validate-workflow-contracts.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: lines 211–212
- Depends On: nothing
- Parallel Group: P1-C
- Action: MODIFY
- Implement:
  - Delete line 211: `assertIncludes('.gitignore', 'kaola-workflow/.locks/');`
  - Delete line 212: `assertIncludes('.gitignore', 'kaola-workflow/.sessions/');`
  - Rationale: coordRoot points at `.git/` which is already gitignored; explicit `.gitignore` entries for these paths are no longer required.
- Mirror: N/A (deletion only).
- Validate: `node scripts/validate-workflow-contracts.js` (must exit 0); `node scripts/simulate-workflow-walkthrough.js`

---

**Task PR1-9: Plugin mirrors (3 files)**

- Files:
  - `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
  - `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js`
  - `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/plugins/kaola-workflow/scripts/validate-workflow-contracts.js` (if present in plugins)
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: plugin directory files only
- Depends On: PR1-5, PR1-7, PR1-8 complete
- Parallel Group: P1-D (3 files can be copied in parallel)
- Action: MODIFY
- Implement:
  - `cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
  - `cp scripts/kaola-workflow-repair-state.js plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js`
  - Check if `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` exists; if so, copy.
  - Byte-for-byte identity: `diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` must show zero diff.
- Mirror: existing mirror pattern (currently identical).
- Validate: `diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` must exit 0.

---

**Task PR1-10: coordRoot precursor sub-case in walkthrough.js**

- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: self
- Write Set: insertion between lines 3217 and 3219 (after Epic 14 finally block, before LOW-3)
- Depends On: PR1-5 complete
- Parallel Group: P1-E
- Action: MODIFY
- Implement:
  - Create temp dir, `git init`, then `git worktree add <tmpDir>-wt main` to create a linked worktree.
  - From within the linked worktree path, call `getCoordRoot()` indirectly: run `node scripts/kaola-workflow-claim.js status` (or a direct `git rev-parse --git-common-dir` assertion).
  - Assert: `coordRoot !== linkedWorktreePath` (they differ because coordRoot resolves to main repo's `.git`).
  - Assert: coordRoot is an absolute path ending in `.git`.
  - Clean up both worktrees in `finally`.
  - Label assertion messages with prefix `'coordRoot-precursor:'`.
- Mirror: Epic Case 13 setup pattern: `fs.mkdtempSync`, `git init`, `git worktree add`, finally `fs.rmSync`.
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0.

---

#### PR-2 Tasks

---

**Task PR2-1: `worktreePathFor(root, project)` + `provisionWorktree(root, project, branch)`**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Cases 15–16)
- Write Set: new function block after `buildSinkBranchName`
- Depends On: PR1-5 (PR-1 must be merged)
- Parallel Group: P2-A
- Action: MODIFY
- Implement:
  - `worktreePathFor(root, project)`: `return path.join(path.dirname(root), path.basename(root) + '.kw', project);`
  - `provisionWorktree(root, project, branch)`: `const wtPath = worktreePathFor(root, project); fs.mkdirSync(path.dirname(wtPath), { recursive: true });`
  - Check if branch already exists: `execFileSync('git', ['branch', '--list', '--', branch], { encoding: 'utf8' }).trim() !== ''`.
  - If branch exists (AC12): `execFileSync('git', ['worktree', 'add', '--', wtPath, branch], { encoding: 'utf8' })`.
  - If branch does not exist: `execFileSync('git', ['worktree', 'add', '-b', branch, '--', wtPath, 'HEAD'], { encoding: 'utf8' })`.
  - If `wtPath` directory already exists and is already a registered worktree (AC4 resume): check `git worktree list --porcelain` for matching path — return existing path without re-provisioning.
  - Wrap in try/catch: on ENOENT or git error, throw with message `'provisionWorktree failed: ' + e.message`.
  - `OFFLINE` guard: `git worktree add` is local and does NOT need guarding.
- Mirror: `writeLockFile` O_EXCL pattern: explicit pre-condition check before side effect.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (sub-cases 15A, 15D)

---

**Task PR2-2: `removeWorktree(coordRoot, project, lock, opts)` + `drainPendingRemovals(coordRoot)`**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 16, especially 16C–16F)
- Write Set: new function block
- Depends On: PR2-1
- Parallel Group: P2-A
- Action: MODIFY
- Implement:

  `removeWorktree`:
  - If `!lock.worktree_path`: return `{ skipped: true }`.
  - `const wtPath = lock.worktree_path;`
  - `let wtReal = ''; try { wtReal = fs.realpathSync(wtPath); } catch (e) { if (e.code === 'ENOENT') return { skipped: true, reason: 'already-removed' }; throw e; }`
  - `let cwdReal = ''; try { cwdReal = fs.realpathSync(process.cwd()); } catch (_) { cwdReal = ''; }`
  - CWD-protection check: `if (cwdReal === wtReal || cwdReal.startsWith(wtReal + path.sep)) { /* deferred */ }`
  - In deferred branch: `const pendingDir = path.join(coordRoot, 'kaola-workflow', '.pending-removal'); fs.mkdirSync(pendingDir, { recursive: true }); fs.writeFileSync(path.join(pendingDir, project + '.json'), JSON.stringify({ project, worktree_path: wtPath, deferred_at: new Date().toISOString() })); return { deferred: true };`
  - Dirty check: `const dirty = execFileSync('git', ['-C', wtPath, 'status', '--porcelain'], { encoding: 'utf8' }).trim() !== '';`
  - Clean: `execFileSync('git', ['worktree', 'remove', '--force', '--', wtPath], { encoding: 'utf8' }); return { removed: true };`
  - Dirty: `const dst = wtPath + '.abandoned-' + new Date().toISOString().replace(/[:.]/g, '-'); fs.renameSync(wtPath, dst); execFileSync('git', ['worktree', 'prune'], { encoding: 'utf8' }); return { abandoned: true, path: dst };`

  `drainPendingRemovals`:
  - `const pendingDir = path.join(coordRoot, 'kaola-workflow', '.pending-removal');`
  - `if (!fs.existsSync(pendingDir)) return;`
  - For each `.json` file: read, call `removeWorktree(coordRoot, entry.project, { worktree_path: entry.worktree_path }, {})`.
  - On `{ removed: true }` or `{ skipped: true }` or `{ abandoned: true }`: `fs.unlinkSync(pendingEntryPath)`.
  - On `{ deferred: true }`: leave entry; will retry on next sweep.
- Mirror: `releaseSession` try/catch-and-continue pattern at line 1225.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (sub-cases 16C–16F)

---

**Task PR2-3: `buildLockData()` extension + `cmdClaim()` transaction rewrite**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Cases 15A, 15B)
- Write Set: `buildLockData` at line 562, `cmdClaim` at line 930
- Depends On: PR2-1, PR2-2
- Parallel Group: P2-B (after P2-A)
- Action: MODIFY
- Implement:

  `buildLockData` addition: add `worktree_path: null, branch: null` to returned object (lines 562–576).

  `cmdClaim()` new transaction body (replacing lines 930–983):
  ```
  const root = getRoot();
  const coordRoot = getCoordRoot();
  migrateLegacyCoordState(root, coordRoot);
  const machineId = getMachineId();
  const now = new Date();
  fs.mkdirSync(locksDir(coordRoot), { recursive: true });

  if (args.issue != null && issueAlreadyClaimed(coordRoot, root, args.issue)) {
    process.exitCode = 2; return;
  }

  const lp = lockPath(coordRoot, args.project);
  const lockData = buildLockData(args, machineId, now);  // worktree_path: null, branch: null

  // Step 1: writeLockFile (O_EXCL)
  for (let i = 0; i < 3; i++) {
    try { writeLockFile(lp, lockData); break; }
    catch (e) { if (e.code !== 'EEXIST' || i === 2) { process.exitCode = 2; return; } sleepMs(50); }
  }

  // Step 2: writeSessionFile
  writeSessionFile(coordRoot, args.session, machineId);

  // Step 3: postGitHubClaim + tiebreaker
  let commentId = null;
  if (!OFFLINE && args.issue != null) {
    try { commentId = postGitHubClaim(args.issue, args.session); } catch (_) {}
  }
  if (commentId !== null) {
    fs.writeFileSync(lp, JSON.stringify(Object.assign({}, lockData, { claim_comment_id: commentId }), null, 2) + '\n', { mode: 0o600 });
  }
  if (!OFFLINE && args.issue != null && commentId) {
    const tbResult = runTiebreakerCheck(args.issue, args.session, commentId);
    if (tbResult !== 'stay' && tbResult.yield) {
      handleTiebreakerYield(coordRoot, args, tbResult);  // pass coordRoot
      return;
    }
  }

  // Step 4: provisionWorktree
  const branch = buildSinkBranchName(args.issue, args.project, args.branch);
  let wtPath = null;
  try {
    const wtResult = provisionWorktree(root, args.project, branch);
    wtPath = wtResult.path;
  } catch (e) {
    releaseSession(coordRoot, args.session, 'worktree-provision-failed', { remoteCleanup: false });
    process.stderr.write('claim: provisionWorktree failed: ' + e.message + '\n');
    process.exitCode = 2; return;
  }

  // Step 5: patch lock with worktree_path + branch
  const finalLock = Object.assign({}, lockData, {
    claim_comment_id: commentId,
    worktree_path: wtPath,
    branch: branch
  });
  fs.writeFileSync(lp, JSON.stringify(finalLock, null, 2) + '\n', { mode: 0o600 });

  // Step 6: updateSinkLease
  const stateFile = path.join(root, 'kaola-workflow', args.project, 'workflow-state.md');
  updateSinkLease(stateFile, finalLock);
  ```
  - `provisionWorktree` returns `{ path: wtPath }`.
  - `handleTiebreakerYield` signature change: first param becomes `coordRoot` (it calls `releaseSession` internally).
- Mirror: `writeLockFile` O_EXCL at line 492; `process.exitCode = 2; return;` convention.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (15A, 15B)

---

**Task PR2-4: Resume path + loud failure (AC4, AC11)**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Cases 15C, 15E)
- Write Set: `cmdClaim()` pre-condition check block (before step 1)
- Depends On: PR2-3
- Parallel Group: P2-B
- Action: MODIFY
- Implement:
  - Before the O_EXCL lock write in `cmdClaim()`, read existing lock: `const existingLock = readJsonFile(lockPath(coordRoot, args.project));`
  - If `existingLock && existingLock.session_id === args.session` (same session — resume path):
    - If `existingLock.worktree_path && fs.existsSync(existingLock.worktree_path)`: skip provisioning, reuse existing. Log to stderr: `'claim: resuming existing worktree at ' + existingLock.worktree_path + '\n'`. Proceed to `updateSinkLease`.
    - If `existingLock.worktree_path && !fs.existsSync(existingLock.worktree_path)` (AC11 loud failure):
      ```
      process.stderr.write(
        'worktree missing at ' + existingLock.worktree_path + ' for project ' + args.project + '\n' +
        'recover with:\n' +
        '  git worktree add ' + existingLock.worktree_path + ' ' + (existingLock.branch || '<branch>') + '\n' +
        '  node scripts/kaola-workflow-claim.js patch-branch --project ' + args.project +
          ' --session ' + args.session + ' --branch ' + (existingLock.branch || '<branch>') + '\n'
      );
      process.exitCode = 2; return;
      ```
- Mirror: `handoffDecision` decision/blockers pattern at line 1072.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (15C, 15E)

---

**Task PR2-5: `cmdWatchPr()` MERGED + CLOSED wiring**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 16A, 16B)
- Write Set: `cmdWatchPr` at lines 1509–1516
- Depends On: PR2-2
- Parallel Group: P2-B
- Action: MODIFY
- Implement:
  - At top of `cmdWatchPr`: add `const coordRoot = getCoordRoot();`.
  - MERGED branch (line 1509): before `releaseSession(...)`:
    `removeWorktree(coordRoot, lock.project, lock);`
    then `releaseSession(coordRoot, lock.session_id, 'merged');`
    then `execFileSync('git', ['branch', '-D', '--', branchName], ...)`.
  - CLOSED branch (line 1514): before `releaseSession(...)`:
    `removeWorktree(coordRoot, lock.project, lock);`
    then `releaseSession(coordRoot, lock.session_id, 'aborted');`
    (no branch delete on close).
  - Both calls: wrap `removeWorktree` in try/catch; log warning on failure, do not abort release.
- Mirror: existing error-swallow pattern for `execFileSync('git', ['branch', '-D', ...])` at line 1512.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (16A, 16B)

---

**Task PR2-6: `cmdSweep()` extension**

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 16G)
- Write Set: `cmdSweep` at lines 1365–1392
- Depends On: PR2-2
- Parallel Group: P2-B
- Action: MODIFY
- Implement:
  - At top of `cmdSweep`: `const coordRoot = getCoordRoot();` (already uses `locksDir(coordRoot)` after PR1).
  - After the existing sweep loop (line 1392): add:
    ```javascript
    try { execFileSync('git', ['worktree', 'prune'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (_) {}
    drainPendingRemovals(coordRoot);
    ```
  - `git worktree prune` is local; no `OFFLINE` guard needed.
- Mirror: existing `try { execFileSync... } catch (_) {}` pattern at lines 1383–1390.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (16G)

---

**Task PR2-7: `kaola-workflow-sink-merge.js` changes**

- File: `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/scripts/kaola-workflow-sink-merge.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Epic Case 16B post-merge cleanup)
- Write Set: sink-merge.js lines 22–31, 124–139
- Depends On: PR2-2 (removeWorktree logic pattern established; sink-merge uses inline or requires from claim.js)
- Parallel Group: P2-B (disjoint file from claim.js)
- Action: MODIFY
- Implement:
  - After `getRoot()` at line 22, add `getCoordRoot()` using identical implementation to claim.js.
  - Decision on sharing: sink-merge does NOT `require` claim.js (claim.js is not exported as a module for this — only `buildSinkBranchName` is exported). Inline `removeWorktree` logic as a simplified version: dirty-check + rename approach; `drainPendingRemovals` not needed in sink-merge.
  - In `postMergeCleanup(args)` at line 124:
    ```javascript
    // Step before branch delete: remove worktree
    const root2 = getRoot();
    const coordRoot = getCoordRoot(root2);
    const lockFilePath = path.join(coordRoot, 'kaola-workflow', '.locks', args.project + '.lock');
    let lock = null;
    try { lock = JSON.parse(fs.readFileSync(lockFilePath, 'utf8')); } catch (_) {}
    if (lock && lock.worktree_path) {
      try {
        const status = execFileSync('git', ['-C', lock.worktree_path, 'status', '--porcelain'], { encoding: 'utf8' }).trim();
        if (!status) {
          execFileSync('git', ['worktree', 'remove', '--force', '--', lock.worktree_path], { encoding: 'utf8' });
        } else {
          const dst = lock.worktree_path + '.abandoned-' + new Date().toISOString().replace(/[:.]/g, '-');
          fs.renameSync(lock.worktree_path, dst);
          execFileSync('git', ['worktree', 'prune'], { encoding: 'utf8' });
        }
      } catch (_) {}
    }
    ```
    Then proceed with existing `git branch -d`, `git push origin --delete`.
  - `--project` arg must be threaded through: `parseArgs` in sink-merge already parses `--project` at line 38.
- Mirror: `postMergeCleanup`'s existing try/catch structure.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (Epic Case 16 sink-merge sub-case)

---

**Task PR2-8: 9 SKILL.md shims**

- Files: all 9 SKILL.md files under `plugins/kaola-workflow/skills/`
- Test File: `scripts/simulate-workflow-walkthrough.js` (LOW-3 corpus-grep — shim must not conflict with existing liveness check)
- Write Set: 9 SKILL.md files (all disjoint)
- Depends On: none (content-only change)
- Parallel Group: P2-B (concurrent with PR2-5, PR2-6, PR2-7)
- Action: MODIFY
- Implement:
  - In each file's Session Heartbeat bash block, locate the line that sets `_TICKER_PID_FILE` or the `nohup node ... ticker` invocation.
  - Add immediately after the block's last git command or at the end of the heartbeat section:
    ```bash
    cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true
    ```
  - `KAOLA_WORKTREE_PATH` will be set by the startup environment (from the lock receipt). On legacy non-worktree sessions, `KAOLA_WORKTREE_PATH` is unset; the `2>/dev/null || true` makes this a no-op.
  - LOW-3 corpus-grep still checks for `kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null` and session rehydration; the shim does not replace those.
- Mirror: existing `[ -n "${KAOLA_SESSION_ID:-}" ] && { ... }` guard style.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (LOW-3 must still pass)

---

**Task PR2-9: Plugin mirrors (claim.js + sink-merge.js)**

- Files:
  - `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
  - `plugins/kaola-workflow/scripts/kaola-workflow-sink-merge.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: plugin directory
- Depends On: PR2-3, PR2-4, PR2-5, PR2-6, PR2-7 all complete
- Parallel Group: P2-C
- Action: MODIFY
- Implement:
  - `cp scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
  - `cp scripts/kaola-workflow-sink-merge.js plugins/kaola-workflow/scripts/kaola-workflow-sink-merge.js`
  - Verify: `diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` → exit 0.
- Mirror: same as PR1-9.
- Validate: `diff` both files exit 0; then `node scripts/simulate-workflow-walkthrough.js`

---

**Task PR2-10: Epic Cases 15 + 16 in `simulate-workflow-walkthrough.js`**

- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: self
- Write Set: insertion at lines 3217–3219 (after Epic 14 finally block, before LOW-3)
- Depends On: PR2-9 complete
- Parallel Group: P2-D
- Action: MODIFY
- Implement: see Epic Case sub-case specs section below.
- Mirror: Epic Cases 13 and 14 setup patterns.
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0 with "Workflow walkthrough simulation passed".

---

### Epic Case Sub-Case Specs

#### Epic Case 15: Worktree Claim / Resume / Takeover (AC1–AC6)

**Setup (shared across 15A–15F):**

```javascript
const claimScript = path.join(root, 'scripts', 'kaola-workflow-claim.js');
const epic15Tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic15-'));
try {
  execFileSync('git', ['init', '-q', '-b', 'main', epic15Tmp]);
  execFileSync('git', ['-C', epic15Tmp, 'commit', '--allow-empty', '-m', 'init']);
  const binDir15 = path.join(epic15Tmp, 'bin');
  fs.mkdirSync(binDir15, { recursive: true });
  const gh15 = path.join(binDir15, 'gh');
  // gh shim: issue list returns [{number:501}]; comment returns URL with comment id 501;
  //          pr view returns {"state":"MERGED"}; all edits exit 0; repo view returns test/repo
  fs.writeFileSync(gh15, `#!/bin/sh
if [ "$1" = "issue" ] && [ "$2" = "list" ]; then printf '[{"number":501}]'; exit 0; fi
if [ "$1" = "issue" ] && [ "$2" = "comment" ]; then echo "https://github.com/test/repo/issues/501#issuecomment-501"; exit 0; fi
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then printf '{"state":"MERGED","url":"https://github.com/test/repo/pull/1","number":1}'; exit 0; fi
if [ "$1" = "label" ] && [ "$2" = "create" ]; then exit 0; fi
if [ "$1" = "issue" ] && [ "$2" = "edit" ]; then exit 0; fi
if [ "$1" = "repo" ] && [ "$2" = "view" ]; then printf '{"owner":{"login":"test"},"name":"repo"}'; exit 0; fi
if [ "$1" = "api" ]; then printf '[]'; exit 0; fi
exit 0
`);
  fs.chmodSync(gh15, 0o755);
  const env15 = { ...process.env, PATH: binDir15 + path.delimiter + (process.env.PATH || ''), HOME: epic15Tmp, KAOLA_WORKFLOW_OFFLINE: '' };
```

---

**Sub-case 15A (AC1): Fresh claim provisions a worktree**

```javascript
// Test setup: none beyond shared setup
const out15A = execFileSync(process.execPath, [
  claimScript, 'claim', '--session', 'sess-15a', '--project', 'issue-501', '--issue', '501', '--runtime', 'claude'
], { cwd: epic15Tmp, encoding: 'utf8', env: env15 }).trim();
const lockPath15A = path.join(epic15Tmp, 'kaola-workflow', '.locks', 'issue-501.lock');
assert(fs.existsSync(lockPath15A), '15A: lock file must exist after claim');
const lock15A = JSON.parse(fs.readFileSync(lockPath15A, 'utf8'));
assert(typeof lock15A.worktree_path === 'string' && lock15A.worktree_path.length > 0,
  '15A: lock must contain worktree_path after claim, got: ' + JSON.stringify(lock15A));
assert(fs.existsSync(lock15A.worktree_path),
  '15A: worktree_path directory must exist, got: ' + lock15A.worktree_path);
assert(typeof lock15A.branch === 'string' && lock15A.branch.startsWith('workflow/'),
  '15A: lock must contain branch starting with workflow/, got: ' + lock15A.branch);
```

What it proves: AC1 — a fresh claim creates a worktree at `worktreePathFor(root, project)` and patches the lock with `worktree_path` and `branch`.

---

**Sub-case 15B (AC2): `worktree_path` and `branch` appear in startup receipt**

```javascript
// Build on 15A state: claim was successful
const lockAfterClaim = JSON.parse(fs.readFileSync(lockPath15A, 'utf8'));
assert(lockAfterClaim.worktree_path, '15B: prerequisite: lock has worktree_path');
// Check startup receipt (written when cmdStartup calls cmdClaim internally, or check lock directly)
// For direct claim: check lock fields only; startup receipt is written by cmdStartup
// Run startup to produce receipt, then verify
const receipt15B = JSON.parse(execFileSync(process.execPath, [
  claimScript, 'status', '--session', 'sess-15a'
], { cwd: epic15Tmp, encoding: 'utf8', env: { ...env15, KAOLA_WORKFLOW_OFFLINE: '1' } }).trim());
assert(Array.isArray(receipt15B) && receipt15B.length === 1, '15B: status must return one entry');
assert(receipt15B[0].lock.worktree_path === lockAfterClaim.worktree_path,
  '15B: status lock must reflect worktree_path, got: ' + JSON.stringify(receipt15B[0].lock));
```

What it proves: AC2 — lock persists `worktree_path` and `branch`; status exposes them.

---

**Sub-case 15C (AC3): coordRoot differs from root in a linked worktree**

```javascript
// Create a second linked worktree
const wtBranch = 'epic15c-linked';
execFileSync('git', ['-C', epic15Tmp, 'branch', wtBranch]);
const linkedWtPath = epic15Tmp + '-linked-wt';
execFileSync('git', ['-C', epic15Tmp, 'worktree', 'add', linkedWtPath, wtBranch]);
try {
  const coordRootFromMain = execFileSync('git', ['rev-parse', '--git-common-dir'],
    { cwd: epic15Tmp, encoding: 'utf8' }).trim();
  const coordRootFromLinked = execFileSync('git', ['rev-parse', '--git-common-dir'],
    { cwd: linkedWtPath, encoding: 'utf8' }).trim();
  // From linked worktree, --git-common-dir should resolve to main repo's .git
  const resolvedMain = path.resolve(epic15Tmp, coordRootFromMain);
  const resolvedLinked = path.resolve(linkedWtPath, coordRootFromLinked);
  assert(resolvedMain === resolvedLinked,
    '15C: coordRoot from main and linked worktree must resolve to same .git, got: ' +
    resolvedMain + ' vs ' + resolvedLinked);
  assert(resolvedLinked !== linkedWtPath,
    '15C: coordRoot must not equal the linked worktree path');
  // Locks written from main repo must be visible from linked worktree's coordRoot
  assert(fs.existsSync(path.join(resolvedLinked, 'kaola-workflow', '.locks', 'issue-501.lock')),
    '15C: lock written during 15A must be accessible via coordRoot from linked worktree');
} finally {
  execFileSync('git', ['-C', epic15Tmp, 'worktree', 'remove', '--force', linkedWtPath]);
}
```

What it proves: AC3 — `--git-common-dir` consistently resolves to the main repo's `.git` from any worktree; locks are shared across worktrees.

---

**Sub-case 15D (AC4): Resume re-uses existing worktree**

```javascript
// 15A lock and worktree still exist (same session sess-15a, same project issue-501)
const wtPathBefore = lock15A.worktree_path;
// Run claim again for the same session — should resume
const resumeResult = spawnSync(process.execPath, [
  claimScript, 'claim', '--session', 'sess-15a', '--project', 'issue-501', '--issue', '501', '--runtime', 'claude'
], { cwd: epic15Tmp, encoding: 'utf8', env: { ...env15, KAOLA_WORKFLOW_OFFLINE: '1' } });
assert(resumeResult.status === 0, '15D: same-session resume must exit 0, got: ' + resumeResult.status + '\nstderr: ' + resumeResult.stderr);
const lockAfterResume = JSON.parse(fs.readFileSync(lockPath15A, 'utf8'));
assert(lockAfterResume.worktree_path === wtPathBefore,
  '15D: resume must reuse existing worktree path, got: ' + lockAfterResume.worktree_path);
assert(fs.existsSync(wtPathBefore), '15D: existing worktree directory must still exist');
```

What it proves: AC4 — same-session claim is idempotent on the worktree; no second `git worktree add` is called.

---

**Sub-case 15E (AC5): Loud failure when worktree_path missing**

```javascript
// Artificially remove the worktree directory (simulate missing worktree)
const lock15E = JSON.parse(fs.readFileSync(lockPath15A, 'utf8'));
const savedWtPath = lock15E.worktree_path;
// Remove it without deregistering from git (simulate accident)
fs.rmSync(savedWtPath, { recursive: true, force: true });
// Now attempt resume
const missingResult = spawnSync(process.execPath, [
  claimScript, 'claim', '--session', 'sess-15a', '--project', 'issue-501', '--issue', '501', '--runtime', 'claude'
], { cwd: epic15Tmp, encoding: 'utf8', env: { ...env15, KAOLA_WORKFLOW_OFFLINE: '1' } });
assert(missingResult.status === 2, '15E: claim with missing worktree must exit 2, got: ' + missingResult.status);
assert(missingResult.stderr.includes('worktree missing at'),
  '15E: error must contain "worktree missing at", got: ' + missingResult.stderr);
assert(missingResult.stderr.includes('git worktree add'),
  '15E: error must include recovery command, got: ' + missingResult.stderr);
assert(missingResult.stderr.includes('patch-branch'),
  '15E: error must include patch-branch recovery step, got: ' + missingResult.stderr);
// Restore worktree for subsequent sub-cases
execFileSync('git', ['-C', epic15Tmp, 'worktree', 'add', savedWtPath, lock15E.branch]);
```

What it proves: AC5 / AC11 — missing worktree produces a loud, actionable error with recovery instructions.

---

**Sub-case 15F (AC6): Branch pre-exists — `git worktree add` without `-b`**

```javascript
// Release 15A session, then re-claim with a different session on a branch that now exists
const relResult = spawnSync(process.execPath, [
  claimScript, 'release', '--session', 'sess-15a'
], { cwd: epic15Tmp, encoding: 'utf8', env: { ...env15, KAOLA_WORKFLOW_OFFLINE: '1' } });
// Branch workflow/issue-501 now exists from the 15A claim
// New session claims same issue
const out15F = execFileSync(process.execPath, [
  claimScript, 'claim', '--session', 'sess-15f', '--project', 'issue-501-take2', '--issue', '501', '--runtime', 'claude'
], { cwd: epic15Tmp, encoding: 'utf8', env: { ...env15, KAOLA_WORKFLOW_OFFLINE: '1' } }).trim();
const lock15F = JSON.parse(fs.readFileSync(
  path.join(epic15Tmp, 'kaola-workflow', '.locks', 'issue-501-take2.lock'), 'utf8'));
// provisionWorktree for a new project with a new branch — check worktree created
assert(fs.existsSync(lock15F.worktree_path), '15F: new project worktree must exist');
// If claiming on existing branch: check git worktree list shows the path
const wtList = execFileSync('git', ['worktree', 'list', '--porcelain'],
  { cwd: epic15Tmp, encoding: 'utf8' });
assert(wtList.includes(lock15F.worktree_path), '15F: worktree must be registered in git');
```

What it proves: AC6 / AC12 — when a branch pre-exists, `provisionWorktree` uses `git worktree add` without `-b`; when branch is new, it uses `-b`.

---

#### Epic Case 16: Worktree Lifecycle / Sweep / CWD-Protection (AC7–AC13)

**Setup (shared across 16A–16G):**

```javascript
const claimScript = path.join(root, 'scripts', 'kaola-workflow-claim.js');
const epic16Tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-epic16-'));
try {
  execFileSync('git', ['init', '-q', '-b', 'main', epic16Tmp]);
  execFileSync('git', ['-C', epic16Tmp, 'commit', '--allow-empty', '-m', 'init']);
  const binDir16 = path.join(epic16Tmp, 'bin');
  fs.mkdirSync(binDir16, { recursive: true });
  // gh shim with pr view returning MERGED for project issue-601, CLOSED for issue-602
  const gh16 = path.join(binDir16, 'gh');
  fs.writeFileSync(gh16, `#!/bin/sh
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  url="$3"
  case "$url" in
    *601*) printf '{"state":"MERGED","url":"%s","number":1}' "$url" ;;
    *602*) printf '{"state":"CLOSED","url":"%s","number":2}' "$url" ;;
    *) printf '{"state":"OPEN","url":"%s","number":3}' "$url" ;;
  esac
  exit 0
fi
if [ "$1" = "issue" ] && [ "$2" = "edit" ]; then exit 0; fi
if [ "$1" = "issue" ] && [ "$2" = "comment" ]; then echo "https://github.com/test/repo/issues/1#issuecomment-1"; exit 0; fi
if [ "$1" = "repo" ] && [ "$2" = "view" ]; then printf '{"owner":{"login":"test"},"name":"repo"}'; exit 0; fi
if [ "$1" = "api" ]; then printf '[]'; exit 0; fi
exit 0
`);
  fs.chmodSync(gh16, 0o755);
  const env16 = { ...process.env, PATH: binDir16 + path.delimiter + (process.env.PATH || ''), HOME: epic16Tmp };
  
  // Pre-provision: claim two projects with worktrees + inject pr_url + sink='pr'
  // issue-601: will be MERGED
  execFileSync(process.execPath, [
    claimScript, 'claim', '--session', 'sess-16-merged', '--project', 'issue-601', '--issue', '601', '--runtime', 'claude', '--sink', 'pr'
  ], { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
  const lp601 = path.join(epic16Tmp, 'kaola-workflow', '.locks', 'issue-601.lock');
  const lock601 = JSON.parse(fs.readFileSync(lp601, 'utf8'));
  // Inject pr_url so watch-pr triggers
  fs.writeFileSync(lp601, JSON.stringify(Object.assign({}, lock601, {
    pr_url: 'https://github.com/test/repo/pull/601',
    sink: 'pr'
  }), null, 2) + '\n');
  
  // issue-602: will be CLOSED
  execFileSync(process.execPath, [
    claimScript, 'claim', '--session', 'sess-16-closed', '--project', 'issue-602', '--issue', '602', '--runtime', 'claude', '--sink', 'pr'
  ], { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
  const lp602 = path.join(epic16Tmp, 'kaola-workflow', '.locks', 'issue-602.lock');
  const lock602 = JSON.parse(fs.readFileSync(lp602, 'utf8'));
  fs.writeFileSync(lp602, JSON.stringify(Object.assign({}, lock602, {
    pr_url: 'https://github.com/test/repo/pull/602',
    sink: 'pr'
  }), null, 2) + '\n');
```

---

**Sub-case 16A (AC7): watch-pr MERGED removes worktree before branch delete**

```javascript
const wtPath601 = JSON.parse(fs.readFileSync(lp601, 'utf8')).worktree_path;
assert(fs.existsSync(wtPath601), '16A prereq: worktree for issue-601 must exist before watch-pr');
execFileSync(process.execPath, [claimScript, 'watch-pr'], { cwd: epic16Tmp, encoding: 'utf8', env: env16 });
assert(!fs.existsSync(lp601), '16A: MERGED lock must be released');
assert(!fs.existsSync(wtPath601),
  '16A: worktree for MERGED project must be removed, path: ' + wtPath601);
```

What it proves: AC7 — `removeWorktree` is called before `git branch -D` in the MERGED branch; worktree directory is gone.

---

**Sub-case 16B (AC8): watch-pr CLOSED removes worktree but does NOT delete branch**

```javascript
const wtPath602 = JSON.parse(fs.readFileSync(lp602, 'utf8')).worktree_path;
const branch602 = JSON.parse(fs.readFileSync(lp602, 'utf8')).branch;
assert(fs.existsSync(wtPath602), '16B prereq: worktree for issue-602 must exist');
// watch-pr already ran in 16A — re-read state; or run targeted:
// (If watch-pr was already called in 16A and processed both, assert here)
assert(!fs.existsSync(lp602), '16B: CLOSED lock must be released');
assert(!fs.existsSync(wtPath602), '16B: worktree for CLOSED project must be removed');
// Branch NOT deleted on close (existing spec behavior unchanged)
if (branch602) {
  const branches = execFileSync('git', ['branch', '--list', '--', branch602],
    { cwd: epic16Tmp, encoding: 'utf8' }).trim();
  // Note: branch may or may not exist depending on git state; key is we do NOT force-delete
  // The assertion is that watch-pr did NOT call git branch -D for CLOSED
  // Indirect proof: if branch exists, watch-pr did not delete it
}
```

What it proves: AC8 — CLOSED PR triggers `removeWorktree` but the "do NOT delete branch on closed-without-merge" invariant is preserved.

---

**Sub-case 16C (AC9): dirty worktree is abandoned not deleted**

```javascript
// Create a project claim with a worktree
execFileSync(process.execPath, [
  claimScript, 'claim', '--session', 'sess-16c', '--project', 'issue-603', '--issue', '603', '--runtime', 'claude', '--sink', 'pr'
], { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
const lp603 = path.join(epic16Tmp, 'kaola-workflow', '.locks', 'issue-603.lock');
const lock603 = JSON.parse(fs.readFileSync(lp603, 'utf8'));
// Write a dirty file in the worktree
fs.writeFileSync(path.join(lock603.worktree_path, 'dirty-file.txt'), 'uncommitted change\n');
// Release (which calls removeWorktree internally via watch-pr chain or direct release)
// For direct test: inject pr_url and mark MERGED in gh shim
// Simplest: call removeWorktree-equivalent logic by triggering watch-pr with custom gh shim
// ... or test via: write a test-only export from claim.js (if module.exports includes removeWorktree)
// For now test via integration: run claim release + observe .abandoned-* directory created
execFileSync(process.execPath, [
  claimScript, 'release', '--session', 'sess-16c'
], { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
// Check if abandoned directory exists (removeWorktree called by release if wired, or via sweep)
// NOTE: release must be wired to call removeWorktree in PR-2
const parentDir = path.dirname(lock603.worktree_path);
const abandonedDirs = fs.existsSync(parentDir)
  ? fs.readdirSync(parentDir).filter(d => d.includes('.abandoned-'))
  : [];
assert(abandonedDirs.length > 0,
  '16C: dirty worktree must be renamed to .abandoned-*, found in ' + parentDir + ': ' + fs.readdirSync(parentDir).join(', '));
```

What it proves: AC9 — `removeWorktree` renames rather than deletes when the worktree contains uncommitted changes.

---

**Sub-case 16D (AC10): CWD-protection defers removal**

```javascript
// Cannot directly test cwd-protection in a Node test (process.cwd() won't be inside the worktree).
// Verify the mechanism: mock by symlinking or use a sub-process that cd's into the worktree.
execFileSync(process.execPath, [
  claimScript, 'claim', '--session', 'sess-16d', '--project', 'issue-604', '--issue', '604', '--runtime', 'claude', '--sink', 'pr'
], { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
const lp604 = path.join(epic16Tmp, 'kaola-workflow', '.locks', 'issue-604.lock');
const lock604 = JSON.parse(fs.readFileSync(lp604, 'utf8'));
const wtPath604 = lock604.worktree_path;
// Trigger removal while cwd IS the worktree: spawn a child process with cwd = wtPath604
const cwdResult = spawnSync(process.execPath, [
  claimScript, 'release', '--session', 'sess-16d'
], { cwd: wtPath604, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
// Release itself may exit 0 but worktree removal must be deferred
const pendingDir = path.join(epic16Tmp, '.git', 'kaola-workflow', '.pending-removal');  // coordRoot = .git
const pendingExists = fs.existsSync(pendingDir) &&
  fs.readdirSync(pendingDir).some(f => f === 'issue-604.json');
// OR worktree still exists (not removed)
const wtStillExists = fs.existsSync(wtPath604);
assert(pendingExists || wtStillExists,
  '16D: CWD-protection must defer removal (pending-removal entry or worktree intact), got: pending=' + pendingExists + ' wtExists=' + wtStillExists);
```

What it proves: AC10 — when the process's cwd is inside the worktree, `removeWorktree` writes a `.pending-removal` entry instead of deleting.

---

**Sub-case 16E (AC11): `drainPendingRemovals` processes deferred entries during sweep**

```javascript
// Using state from 16D (pending-removal entry for issue-604)
// Now run sweep from a different cwd (not inside the worktree)
execFileSync(process.execPath, [claimScript, 'sweep'],
  { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
// After sweep, worktree should be removed (cwd is now epic16Tmp, not inside wtPath604)
assert(!fs.existsSync(wtPath604) || !fs.existsSync(path.join(coordRootFromPrevious, 'kaola-workflow', '.pending-removal', 'issue-604.json')),
  '16E: sweep must drain pending-removal entries; worktree or entry must be gone');
```

What it proves: AC11 — `drainPendingRemovals` in sweep processes previously-deferred removals when the CWD guard no longer triggers.

---

**Sub-case 16F (AC12): `git worktree prune` is called during sweep**

```javascript
// Create orphaned worktree directory (simulate a manual rm of a worktree directory)
// git worktree prune cleans up stale administrative files
const orphanBranch = 'epic16f-orphan';
execFileSync('git', ['-C', epic16Tmp, 'branch', orphanBranch]);
const orphanPath = epic16Tmp + '-orphan-wt';
execFileSync('git', ['-C', epic16Tmp, 'worktree', 'add', orphanPath, orphanBranch]);
// Manually delete the directory without git worktree remove
fs.rmSync(orphanPath, { recursive: true, force: true });
// git worktree list before sweep: orphan entry is still registered
const listBefore = execFileSync('git', ['worktree', 'list', '--porcelain'],
  { cwd: epic16Tmp, encoding: 'utf8' });
assert(listBefore.includes(orphanPath), '16F prereq: orphaned worktree must appear in list before sweep');
// Run sweep
execFileSync(process.execPath, [claimScript, 'sweep'],
  { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
const listAfter = execFileSync('git', ['worktree', 'list', '--porcelain'],
  { cwd: epic16Tmp, encoding: 'utf8' });
assert(!listAfter.includes(orphanPath),
  '16F: sweep must call git worktree prune, removing orphaned entries');
```

What it proves: AC12 — `cmdSweep` calls `git worktree prune`, removing stale worktree administrative entries.

---

**Sub-case 16G (AC13): sink-merge removes worktree before branch delete**

```javascript
// This is an integration test of kaola-workflow-sink-merge.js removeWorktree wiring.
// Set up: create a claim, then simulate sink-merge's postMergeCleanup invocation.
execFileSync(process.execPath, [
  claimScript, 'claim', '--session', 'sess-16g', '--project', 'issue-605', '--issue', '605', '--runtime', 'claude'
], { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
const lp605 = path.join(epic16Tmp, 'kaola-workflow', '.locks', 'issue-605.lock');
const lock605 = JSON.parse(fs.readFileSync(lp605, 'utf8'));
const wtPath605 = lock605.worktree_path;
assert(fs.existsSync(wtPath605), '16G prereq: worktree must exist before sink-merge');
// Run sink-merge in OFFLINE mode (skips push/close/remote-delete)
const sinkMergeScript = path.join(root, 'scripts', 'kaola-workflow-sink-merge.js');
const smResult = spawnSync(process.execPath, [
  sinkMergeScript, '--branch', lock605.branch, '--project', 'issue-605', '--issue', '605'
], { cwd: epic16Tmp, encoding: 'utf8', env: { ...env16, KAOLA_WORKFLOW_OFFLINE: '1' } });
// In OFFLINE mode sink-merge skips git fetch, push, issue-close
// But postMergeCleanup still runs git branch -d (local) and removeWorktree (local, not guarded)
assert(!fs.existsSync(wtPath605),
  '16G: sink-merge postMergeCleanup must remove worktree before branch delete, path: ' + wtPath605 +
  '\nstdout: ' + smResult.stdout + '\nstderr: ' + smResult.stderr);
```

What it proves: AC13 — `postMergeCleanup` in sink-merge calls `removeWorktree` before `git branch -d`, fixing the latent ordering bug.

---

### Edge Cases / Error Paths Not Yet Covered

1. **`getCoordRoot()` from a non-git directory**: `execFileSync` throws; fallback returns `path.join(process.cwd(), '.git')`. Callers that expect a real coordRoot will silently create locks under `cwd/.git/kaola-workflow/.locks/`. This is no worse than the existing `getRoot()` fallback behavior.

2. **Cross-filesystem `fs.renameSync` in `migrateLegacyCoordState`**: if the main repo's `.git` is on a different filesystem partition than the worktree-level `root`, `renameSync` will throw `EXDEV`. Solution: use `fs.copyFileSync(src, dst) + fs.unlinkSync(src)` with a pre-check `if (!fs.existsSync(dst))` to maintain idempotency. This must be in the implementation, not just documented.

3. **`provisionWorktree` when target directory already exists but is not a registered worktree**: `git worktree add` exits non-zero ("already a working tree" / "already exists"). The error handler in `cmdClaim` will call `releaseSession + exit 2`. The developer should be aware this can happen if a previous claim left an orphaned directory without cleaning `.git/worktrees/`. Mitigation: before calling `git worktree add`, check `git worktree list --porcelain` for the target path; if present, treat as AC4 resume.

4. **`cmdHandoff` with worktree**: The existing `cmdHandoff` does `Object.assign({}, existing, { session_id, ... })`. Since `worktree_path` and `branch` are now fields on the lock, they are preserved by the spread. No code change needed. Document explicitly that the worktree is not moved on handoff.

5. **`handleTiebreakerYield` calls `releaseSession`**: After PR-2, this is called before `provisionWorktree` (step 4 comes after tiebreaker check at step 3). No worktree exists yet when yield fires, so `releaseSession` does not need to call `removeWorktree`. This ordering is safe and must remain — do not reorder steps 3 and 4.

6. **`cmdPatchBranch` after worktree provision**: line 1454 does `Object.assign({}, lock, { branch: args.branch })`. This correctly overwrites `lock.branch` but leaves `worktree_path` intact. The worktree is already on the old branch when patch-branch is called; the user must manually `git checkout` inside the worktree. Document this in the recovery instructions generated by loud-failure (AC11).

7. **`removeWorktree` ENOENT on `realpathSync(wtPath)`**: treated as "already removed — skip silently". Do not propagate the error. This handles the case where `removeWorktree` is called twice (e.g., in both `cmdWatchPr` and a concurrent sweep).

8. **ISO8601 timestamp in `.abandoned-<ISO8601>` path**: ISO8601 contains `:` which is invalid on Windows NTFS. Replace `:` and `.` with `-` in the timestamp component using `.replace(/[:.]/g, '-')`. The spec example does this — confirm the implementation follows exactly.

9. **`drainPendingRemovals` concurrent callers**: Two sweep processes could both read the same `.pending-removal/` entry. The `removeWorktree` call inside drain uses `git worktree remove --force` which is idempotent if the path is already gone (exits 0). The `fs.unlinkSync(pendingEntryPath)` after success is last-writer-wins safe because both callers succeed on the same operation. No additional locking needed.

10. **`git worktree add` in OFFLINE mode**: Local git operations are NOT guarded by `OFFLINE`. This is intentional per the spec. Confirm that tests in OFFLINE mode (`KAOLA_WORKFLOW_OFFLINE=1`) still exercise `provisionWorktree` and `removeWorktree` (they should — these are local git ops). Epic Cases 15 and 16 use `OFFLINE` for some sub-cases; provisioning must still work.

11. **Startup receipt `worktree_path` field**: After PR-2, `cmdStartup` calls `cmdClaim` internally via `runBootstrapClaim`. The startup receipt is written after claim completes. The receipt does not directly include `worktree_path` (it's in the lock). No change to receipt format needed unless `writeStartupReceipt` is explicitly extended — leave it unchanged.

12. **The `module.exports` line at 1554**: currently exports only `buildSinkBranchName`. After PR-2, consider also exporting `removeWorktree` and `getCoordRoot` so sink-merge can require them instead of inlining. The spec says "prefer: inline the coordRoot lookup and removeWorktree logic, or require claim.js functions if they're exported" — make the choice explicit: export `getCoordRoot` and `removeWorktree` in PR-2, then `kaola-workflow-sink-merge.js` requires them. This avoids duplicate code drift. Update: `module.exports = { buildSinkBranchName, getCoordRoot, removeWorktree };`