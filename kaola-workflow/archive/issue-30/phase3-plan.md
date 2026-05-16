# Phase 3 - Plan: issue-30

## Blueprint

### Files to Modify

| File | Changes | PR |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | Add `getCoordRoot()`, `migrateLegacyCoordState()` (linkSync pattern), backwards-compat readers, retarget path helpers, thread ~30+ call sites, add worktree functions, rewrite `cmdClaim`, wire `cmdWatchPr`/`cmdSweep` | PR-1 + PR-2 |
| `hooks/kaola-workflow-pre-commit.sh` | Add `--git-common-dir` COORD_ROOT derivation; change lock path to coordRoot; add legacy fallback comment | PR-1 |
| `scripts/kaola-workflow-repair-state.js` | `projectOwner()` line 80: derive coordRoot inline; change lock read path; add legacy fallback | PR-1 |
| `scripts/validate-workflow-contracts.js` | Remove two `.gitignore` assertions for `.locks/` and `.sessions/` | PR-1 |
| `scripts/kaola-workflow-sink-merge.js` | Add `getCoordRoot()`; add inline `removeWorktree`; wire into `postMergeCleanup()` before `git branch -d` | PR-2 |
| `scripts/simulate-workflow-walkthrough.js` | Add coordRoot precursor sub-case (PR-1); add Epic Cases 15 (AC1–AC6) + 16 (AC7–AC13 + 16H) (PR-2) | PR-1 + PR-2 |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-for-byte mirror of scripts/ version | PR-1 + PR-2 |
| `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js` | Byte-for-byte mirror | PR-1 |
| `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` | Byte-for-byte mirror | PR-1 |
| `plugins/kaola-workflow/scripts/kaola-workflow-sink-merge.js` | Byte-for-byte mirror | PR-2 |
| 9× `plugins/kaola-workflow/skills/*/SKILL.md` | Add `cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true` shim in Session Heartbeat block | PR-2 |

### Build Sequence

#### PR-1 (coordRoot substrate)

1. `getCoordRoot()` — pure addition after `getRoot()` at line 89
2. `migrateLegacyCoordState(root, coordRoot)` — uses `linkSync`/EXDEV pattern; depends on step 1
3. Backwards-compat lock/session reader wrapper — depends on step 1
4. Path helper signature change (`locksDir`, `sessionsDir`, `lockPath`, `sessionPath`, `tickerPidPath`) — param rename only
5. Call-site threading (~30+ sites) — depends on steps 1–4
6. `hooks/kaola-workflow-pre-commit.sh` lines 4 + 54 — independent (disjoint file)
7. `kaola-workflow-repair-state.js` line 80 — independent (disjoint file)
8. `validate-workflow-contracts.js` lines 211–212 deletion — independent
9. Plugin mirrors (3 files) — after steps 5–8
10. coordRoot precursor sub-case in `simulate-workflow-walkthrough.js` — after step 5

#### PR-2 (worktree provisioning + lifecycle; serialized after PR-1 lands)

11. `worktreePathFor(root, project)` + `provisionWorktree(root, project, branch)` — no dependencies (beyond PR-1)
12. `removeWorktree(coordRoot, project, lock)` + `drainPendingRemovals(coordRoot)` — depends on step 11
13. `buildLockData()` extension + merged `cmdClaim()` transaction (resume-detection + O_EXCL) — depends on steps 11–12
14. `cmdWatchPr()` MERGED + CLOSED wiring — depends on step 12
15. `cmdSweep()` extension (`git worktree prune` + `drainPendingRemovals`) — depends on step 12
16. `kaola-workflow-sink-merge.js` changes — depends on step 12 (inline removeWorktree)
17. 9 SKILL.md shims — independent (content-only)
18. Plugin mirrors (claim.js + sink-merge.js) — after steps 13–16
19. Epic Cases 15 + 16 (including 16H) in `simulate-workflow-walkthrough.js` — after step 18

### Parallelization Plan

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| P1-A | Steps 1–4 (all in claim.js) | Serialized by single file |
| P1-B | Step 5 | After P1-A; single file |
| P1-C | Steps 6, 7, 8 | Disjoint files; concurrent with P1-B |
| P1-D | Step 9 (3 plugin copies) | Disjoint files from each other |
| P1-E | Step 10 | After P1-B; single file |
| P2-A | Steps 11, 12 | Single file; serialize within |
| P2-B | Steps 13, 14, 15 (claim.js); step 16 (sink-merge.js); step 17 (9 SKILLs) | claim.js is one file; sink-merge.js and SKILL.md files are all disjoint |
| P2-C | Step 18 (2 plugin copies) | Disjoint files |
| P2-D | Step 19 | After P2-C |

---

## Items Deferred

- **Shell pwd grace (issue §6 rule 4)**: When removing a worktree, the next `/workflow-next` should detect that `pwd` no longer exists and emit one line directing the user back to the main repo. This is a 5-line router addition. Deferred to a follow-up issue. Phase 2 advisor committed that this must be in-scope OR have an explicit follow-up issue. Action: open a follow-up issue before Phase 6 closes.

---

## Task List

### Task PR1-1: Add `getCoordRoot()`

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (coordroot precursor sub-case)
- Write Set: new function block after `getRoot()` at line 89
- Depends On: nothing
- Parallel Group: P1-A
- Action: MODIFY
- Implement:
  - Insert after `getRoot()`.
  - Call `execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })`.
  - Wrap in try/catch: on error, return `path.join(root, '.git')`.
  - Always: `return path.resolve(root, rawOutput.trim())` — handles both `.git` (relative, primary worktree) and `/abs/.git` (linked worktree absolute output).
  - `root` parameter defaults to internal `getRoot()` call.
- Mirror: `getRoot()` at lines 80–89 — same `execFileSync` + stdio + try/catch structure.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task PR1-2: Add `migrateLegacyCoordState(root, coordRoot)`

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (coordroot precursor sub-case asserts idempotency)
- Write Set: new function block after `getCoordRoot()`
- Depends On: PR1-1
- Parallel Group: P1-A
- Action: MODIFY
- Implement (ADVISOR CORRECTION #2 — use `linkSync`, NOT `renameSync`):
  - For each of `['.locks', '.sessions', '.tickers']`: `fs.readdirSync(legacyDir)` — catch ENOENT → continue.
  - For each file: compute `legacyPath` and `newPath`; `fs.mkdirSync(path.dirname(newPath), { recursive: true })`.
  - **Primary move**: `fs.linkSync(legacyPath, newPath)` — atomic, EEXIST = already migrated → continue; on success `fs.unlinkSync(legacyPath)`.
  - **Cross-filesystem (EXDEV) fallback**:
    ```javascript
    try { fs.openSync(newPath, 'wx'); } catch (e2) { if (e2.code === 'EEXIST') continue; throw e2; }
    fs.copyFileSync(legacyPath, newPath);
    fs.unlinkSync(legacyPath);
    ```
  - On any other error: `process.stderr.write('migrate warn: ' + e.message + '\n')`, continue.
  - Called at top of `cmdClaim()` before `fs.mkdirSync(locksDir(coordRoot))`.
- Mirror: `releaseSession` error-swallow pattern at line 1225.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task PR1-3: Backwards-compat lock/session reader

- File: `scripts/kaola-workflow-claim.js`
- Write Set: new helper; modify `readLockFiles`, `readSessionFile`, `readStartupReceipt`
- Depends On: PR1-1
- Parallel Group: P1-A
- Action: MODIFY
- Implement:
  - `readJsonFileWithFallback(newPath, legacyPath)` — `readJsonFile(newPath) || readJsonFile(legacyPath)`.
  - `readLockFiles(coordRoot)`: scan `locksDir(coordRoot)` first, deduplicate against `locksDir(root)` (legacy).
  - `readSessionFile` / `readStartupReceipt`: try new coordRoot path, fallback to root path.
- Mirror: `readJsonFile` null-return pattern at line 139.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task PR1-4: Path helper signature change

- File: `scripts/kaola-workflow-claim.js`
- Write Set: lines 133–137 (signature rename only)
- Depends On: PR1-1
- Parallel Group: P1-A
- Action: MODIFY
- Implement:
  - `locksDir(coordRoot)`, `sessionsDir(coordRoot)`, `lockPath(coordRoot, project)`, `sessionPath(coordRoot, sessionId)`, `tickerPidPath(coordRoot, sessionId)` — first param renamed from `root`; body semantics unchanged.
  - `roadmapDir(root)` and state-file paths: untouched.
- Validate: static review; behavioral validation in PR1-5.

---

### Task PR1-5: Call-site threading (~30+ sites)

- File: `scripts/kaola-workflow-claim.js`
- Write Set: every `cmd*()` body that calls lock/session/ticker path helpers
- Depends On: PR1-1 through PR1-4
- Parallel Group: P1-B
- Action: MODIFY
- Implement:
  - Add `const coordRoot = getCoordRoot();` at top of every affected `cmd*()` function.
  - Affected: `cmdClaim`, `cmdHandoff`, `cmdCanHandoff`, `cmdHeartbeat`, `cmdRelease`, `cmdSweep`, `cmdStatus`, `cmdWatchPr`, `cmdPatchBranch`, `releaseSession`, `readLockFiles`, `sessionForProject`, `ownedActiveProject`, `issueAlreadyClaimed`, `writeSessionFile`, `writeStartupReceipt`, `readStartupReceipt`, `cmdVerifyStartup`, `cmdStartup`, `cmdHandoff`, `cmdTicker`, `localOwnerLiveness`, `runTick`.
  - State-file `path.join(root, 'kaola-workflow', project, ...)` calls: untouched.
  - `localOwnerLiveness(root, coordRoot, ownerSession, lock, now)` — explicit signature change (ADVISOR IMPORTANT #8).
  - `handleTiebreakerYield(coordRoot, args, tbResult)` — first param becomes `coordRoot` (ADVISOR IMPORTANT #8).
- Mirror: existing `const root = getRoot();` pattern present in every cmd function.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (all existing cases must pass)

---

### Task PR1-6: `hooks/kaola-workflow-pre-commit.sh` changes

- File: `hooks/kaola-workflow-pre-commit.sh`
- Write Set: lines 4 and 54
- Depends On: nothing
- Parallel Group: P1-C
- Action: MODIFY
- Implement:
  - After line 4 (`GIT_ROOT=...`), add:
    ```bash
    COORD_ROOT="$(git rev-parse --git-common-dir 2>/dev/null)" || COORD_ROOT=""
    [ -n "$COORD_ROOT" ] && COORD_ROOT="$(cd "$GIT_ROOT" && realpath "$COORD_ROOT" 2>/dev/null)" || COORD_ROOT="$GIT_ROOT/.git"
    ```
  - Line 54: change `LOCK_FILE="$GIT_ROOT/kaola-workflow/.locks/${PROJECT}.lock"` to `LOCK_FILE="$COORD_ROOT/kaola-workflow/.locks/${PROJECT}.lock"`.
  - Add below line 54: `# Legacy fallback (dropped in v3.3.x): $GIT_ROOT/kaola-workflow/.locks/`
  - Add legacy fallback in the `if [ -f "$LOCK_FILE" ]` block: if `$LOCK_FILE` not found, try `$GIT_ROOT/kaola-workflow/.locks/${PROJECT}.lock`.
- Mirror: existing `GIT_ROOT` pattern at line 4.
- Validate: `bash -n hooks/kaola-workflow-pre-commit.sh`; Epic Case 16H (AC9).

---

### Task PR1-7: `kaola-workflow-repair-state.js` coordRoot at line 80

- File: `scripts/kaola-workflow-repair-state.js`
- Write Set: `projectOwner()` at line 80
- Depends On: nothing
- Parallel Group: P1-C
- Action: MODIFY
- Implement:
  - Derive `coordRoot` inline via `execFileSync('git', ['rev-parse', '--git-common-dir'])` + `path.resolve`.
  - Change `lockFile` path to `path.join(coordRoot, 'kaola-workflow', '.locks', project + '.lock')`.
  - Add legacy fallback: if new path doesn't exist, try `path.join(workflowDir, '.locks', project + '.lock')`.
  - Wrap in try/catch: on error, fall back to existing behavior.
- Mirror: `getRoot()` error handling style.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task PR1-8: `validate-workflow-contracts.js` assertion removal

- File: `scripts/validate-workflow-contracts.js`
- Write Set: lines 211–212
- Depends On: nothing
- Parallel Group: P1-C
- Action: MODIFY
- Implement:
  - Delete line 211: `assertIncludes('.gitignore', 'kaola-workflow/.locks/');`
  - Delete line 212: `assertIncludes('.gitignore', 'kaola-workflow/.sessions/');`
  - Rationale: coordRoot points at `.git/` which is already gitignored.
- Validate: `node scripts/validate-workflow-contracts.js` exits 0.

---

### Task PR1-9: Plugin mirrors (3 files)

- Files: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js`, `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`
- Depends On: PR1-5, PR1-7, PR1-8
- Parallel Group: P1-D
- Action: MODIFY
- Implement: `cp scripts/<name> plugins/kaola-workflow/scripts/<name>` for each.
- Validate: `diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` exits 0.

---

### Task PR1-10: coordRoot precursor sub-case in walkthrough.js

- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: insertion between lines 3217 and 3219
- Depends On: PR1-5
- Parallel Group: P1-E
- Action: MODIFY
- Implement:
  - `fs.mkdtempSync` → `git init` → `git worktree add <tmp>-wt main` (linked worktree).
  - From both paths, run `git rev-parse --git-common-dir` and resolve.
  - Assert: `coordRoot from main === coordRoot from linked` (same `.git` directory).
  - Assert: resolved path ends in `.git` and is absolute.
  - `finally`: `git worktree remove --force`, `fs.rmSync`.
  - Label assertions with `'coordRoot-precursor:'` prefix.
- Mirror: Epic Case 13 setup pattern.
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0.

---

### Task PR2-1: `worktreePathFor()` + `provisionWorktree()`

- File: `scripts/kaola-workflow-claim.js`
- Write Set: new function block after `buildSinkBranchName`
- Depends On: PR-1 merged
- Parallel Group: P2-A
- Action: MODIFY
- Implement:
  - `worktreePathFor(root, project)`: `return path.join(path.dirname(root), path.basename(root) + '.kw', project);`
  - `provisionWorktree(root, project, branch)`:
    - `const wtPath = worktreePathFor(root, project); fs.mkdirSync(path.dirname(wtPath), { recursive: true });`
    - Check `git worktree list --porcelain` for `wtPath` — if found, return `{ path: wtPath }` (AC4 resume guard).
    - If branch exists (`git branch --list -- branch` non-empty): `git worktree add -- wtPath branch` (no `-b`, AC12).
    - If branch does not exist: `git worktree add -b branch -- wtPath HEAD`.
    - On failure: throw `'provisionWorktree failed: ' + e.message`.
    - `git worktree add` is local — NO `OFFLINE` guard.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (sub-cases 15A, 15D).

---

### Task PR2-2: `removeWorktree()` + `drainPendingRemovals()`

- File: `scripts/kaola-workflow-claim.js`
- Write Set: new function block
- Depends On: PR2-1
- Parallel Group: P2-A
- Action: MODIFY
- Implement:

  `removeWorktree(coordRoot, project, lock)`:
  - If `!lock.worktree_path`: return `{ skipped: true }`.
  - `let wtReal; try { wtReal = fs.realpathSync(wtPath); } catch (e) { if (e.code === 'ENOENT') return { skipped: true, reason: 'already-removed' }; throw e; }`
  - `let cwdReal = ''; try { cwdReal = fs.realpathSync(process.cwd()); } catch (_) { cwdReal = ''; }`
  - CWD-protection (ADVISOR CORRECTION #5 — use correct comparator):
    ```javascript
    if (cwdReal === wtReal || cwdReal.startsWith(wtReal + path.sep)) {
      // write .pending-removal/<project>.json under coordRoot; return { deferred: true }
    }
    ```
    NOT bare `startsWith(wtReal)` — path prefix trap.
  - Dirty check: `git -C wtPath status --porcelain` — empty string → clean.
  - Clean: `git worktree remove --force -- wtPath`; return `{ removed: true }`.
  - Dirty: rename `wtPath → wtPath + '.abandoned-' + now.toISOString().replace(/[:.]/g, '-')`; `git worktree prune`; return `{ abandoned: true }`.

  `drainPendingRemovals(coordRoot)`:
  - List `.json` files under `coordRoot/kaola-workflow/.pending-removal/`.
  - For each: `removeWorktree(coordRoot, entry.project, { worktree_path: entry.worktree_path })`.
  - On `{ removed }`, `{ abandoned }`, or `{ skipped }`: `fs.unlinkSync(entryPath)`.
  - On `{ deferred }`: leave; retry next sweep.

  Export: add `removeWorktree` and `getCoordRoot` to `module.exports` (line ~1554) so `sink-merge.js` can require them.

- Mirror: `releaseSession` try/catch-and-continue pattern.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (sub-cases 16C–16F).

---

### Task PR2-3+4: Merged `cmdClaim()` transaction (ADVISOR CORRECTION #3 + #4)

- File: `scripts/kaola-workflow-claim.js`
- Write Set: `buildLockData` at line 562; `cmdClaim` at line 930
- Depends On: PR2-1, PR2-2
- Parallel Group: P2-B
- Action: MODIFY
- Note: Advisor corrections #3 (no EEXIST retry) and #4 (merge PR2-3+PR2-4 into one atomic task with resume-detection before writeLockFile) are applied here together.
- Implement:

  `buildLockData()`: add `worktree_path: null, branch: null` to returned object.

  `cmdClaim()` new transaction body:
  ```
  const root = getRoot();
  const coordRoot = getCoordRoot();
  migrateLegacyCoordState(root, coordRoot);
  fs.mkdirSync(locksDir(coordRoot), { recursive: true });

  if (args.issue != null && issueAlreadyClaimed(coordRoot, root, args.issue)) {
    process.exitCode = 2; return;
  }

  const lp = lockPath(coordRoot, args.project);

  // Resume-detection BEFORE writeLockFile (prevents stale clobber)
  const existingLock = readJsonFile(lp);
  if (existingLock && existingLock.session_id === args.session) {
    if (existingLock.worktree_path && fs.existsSync(existingLock.worktree_path)) {
      // AC4: reuse existing worktree
      process.stderr.write('claim: resuming existing worktree at ' + existingLock.worktree_path + '\n');
      updateSinkLease(stateFile, existingLock);
      return;
    }
    if (existingLock.worktree_path && !fs.existsSync(existingLock.worktree_path)) {
      // AC11: loud failure with actionable recovery instructions
      process.stderr.write(
        'worktree missing at ' + existingLock.worktree_path + ' for project ' + args.project + '\n' +
        'recover with:\n' +
        '  git worktree add ' + existingLock.worktree_path + ' ' + (existingLock.branch || '<branch>') + '\n' +
        '  node scripts/kaola-workflow-claim.js patch-branch --project ' + args.project +
          ' --session ' + args.session + ' --branch ' + (existingLock.branch || '<branch>') + '\n'
      );
      process.exitCode = 2; return;
    }
  }

  const lockData = buildLockData(args, machineId, now);  // worktree_path: null, branch: null

  // Step 1: writeLockFile — single O_EXCL attempt, NO retry (ADVISOR CORRECTION #3)
  try { writeLockFile(lp, lockData); }
  catch (e) { if (e.code === 'EEXIST' || e.code === 'EACCES') { process.exitCode = 2; return; } throw e; }

  // Step 2: writeSessionFile
  writeSessionFile(coordRoot, args.session, machineId);

  // Step 3: postGitHubClaim + tiebreaker
  // ... (existing pattern, pass coordRoot to handleTiebreakerYield)
  // if tiebreaker yields: handleTiebreakerYield(coordRoot, args, tbResult); return;

  // Step 4: provisionWorktree (AFTER tiebreaker — no worktree created on yield)
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
  const finalLock = Object.assign({}, lockData, { claim_comment_id: commentId, worktree_path: wtPath, branch });
  fs.writeFileSync(lp, JSON.stringify(finalLock, null, 2) + '\n', { mode: 0o600 });

  // Step 6: updateSinkLease
  updateSinkLease(stateFile, finalLock);
  ```

- Mirror: `writeLockFile` O_EXCL at line 492; `process.exitCode = 2; return;` convention.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (15A, 15B, 15D, 15E).

---

### Task PR2-5: `cmdWatchPr()` MERGED + CLOSED wiring

- File: `scripts/kaola-workflow-claim.js`
- Write Set: `cmdWatchPr` at lines 1509–1516
- Depends On: PR2-2
- Parallel Group: P2-B
- Action: MODIFY
- Implement:
  - Add `const coordRoot = getCoordRoot();` at top of `cmdWatchPr`.
  - MERGED (line 1509): `try { removeWorktree(coordRoot, lock.project, lock); } catch (_) {}` before `releaseSession`.
  - CLOSED (line 1514): same `removeWorktree` call before `releaseSession`. No branch delete on close.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (16A, 16B).

---

### Task PR2-6: `cmdSweep()` extension

- File: `scripts/kaola-workflow-claim.js`
- Write Set: `cmdSweep` after existing sweep loop at line 1392
- Depends On: PR2-2
- Parallel Group: P2-B
- Action: MODIFY
- Implement:
  ```javascript
  try { execFileSync('git', ['worktree', 'prune'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (_) {}
  drainPendingRemovals(coordRoot);
  ```
- Validate: `node scripts/simulate-workflow-walkthrough.js` (16F, 16G).

---

### Task PR2-7: `kaola-workflow-sink-merge.js` changes

- File: `scripts/kaola-workflow-sink-merge.js`
- Write Set: lines 22–31, 124–139
- Depends On: PR2-2 (exports `getCoordRoot`, `removeWorktree` from claim.js)
- Parallel Group: P2-B (disjoint file)
- Action: MODIFY
- Implement:
  - At top of sink-merge.js: `const { getCoordRoot, removeWorktree } = require('./kaola-workflow-claim.js');`
  - In `postMergeCleanup(args)` before `git branch -d`:
    ```javascript
    const root2 = getRoot();
    const coordRoot = getCoordRoot();
    const lockFilePath = path.join(coordRoot, 'kaola-workflow', '.locks', args.project + '.lock');
    let lock = null;
    try { lock = JSON.parse(fs.readFileSync(lockFilePath, 'utf8')); } catch (_) {}
    if (lock) { try { removeWorktree(coordRoot, args.project, lock); } catch (_) {} }
    ```
  - `--project` already parsed in `parseArgs` at line 38.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (Epic Case 16G).

---

### Task PR2-8: 9 SKILL.md shims

- Files: all 9 SKILL.md files under `plugins/kaola-workflow/skills/`
- Depends On: none
- Parallel Group: P2-B (concurrent)
- Action: MODIFY
- Implement: In each file's Session Heartbeat bash block, add after the heartbeat/ticker section:
  ```bash
  cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true
  ```
  On legacy non-worktree sessions `KAOLA_WORKTREE_PATH` is unset; `2>/dev/null || true` makes this a no-op.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (LOW-3 must still pass).

---

### Task PR2-9: Plugin mirrors (claim.js + sink-merge.js)

- Files: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/kaola-workflow-sink-merge.js`
- Depends On: PR2-3+4 through PR2-7
- Parallel Group: P2-C
- Action: MODIFY
- Implement: `cp` each script to plugin dir.
- Validate: `diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` exits 0.

---

### Task PR2-10: Epic Cases 15 + 16 in `simulate-workflow-walkthrough.js`

- File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: insertion between lines 3217 and 3219
- Depends On: PR2-9
- Parallel Group: P2-D
- Action: MODIFY
- Implement: see sub-case specs below.
- Validate: `node scripts/simulate-workflow-walkthrough.js` exits 0 with "Workflow walkthrough simulation passed".

---

## Epic Case Sub-Case Specs

### Epic Case 15: Worktree Claim / Resume / Takeover (AC1–AC6)

**Setup (shared):** `fs.mkdtempSync` → `git init -b main` → initial empty commit → `bin/gh` shim (issue list returns `[{number:501}]`; comment returns URL with id 501; pr view returns MERGED; repo view returns test/repo; all edits exit 0) → `env15` with `PATH: binDir15 + delimiter + ...`.

**15A (AC1):** Fresh claim provisions a worktree.
- Run: `claim --session sess-15a --project issue-501 --issue 501 --runtime claude`.
- Assert: lock file exists; `lock.worktree_path` is a non-empty string pointing to an existing directory; `lock.branch` starts with `workflow/`.

**15B (AC2):** `worktree_path` and `branch` visible in status.
- Build on 15A state; run `status --session sess-15a` (OFFLINE=1).
- Assert: status entry's `lock.worktree_path` matches lock file value.

**15C (AC3):** coordRoot from main repo equals coordRoot from linked worktree.
- Create a second linked worktree via `git -C epic15Tmp worktree add linkedPath someNewBranch`.
- Run `git rev-parse --git-common-dir` from both `epic15Tmp` and `linkedPath`; resolve both.
- Assert: resolved values are equal.
- Assert: resolved path !== linkedPath.
- Assert: lock written in 15A accessible via resolved coordRoot from linked worktree.
- `finally`: `git worktree remove --force linkedPath`.

**15D (AC4):** Same-session re-claim reuses existing worktree.
- Run `claim --session sess-15a --project issue-501 --issue 501 --runtime claude` (OFFLINE=1) a second time.
- Assert: exit 0; `lock.worktree_path` unchanged; worktree directory still exists.

**15E (AC5 / AC11):** Missing worktree → loud failure with recovery instructions.
- Remove the worktree directory with `fs.rmSync`.
- Run claim again.
- Assert: exit 2; stderr includes `"worktree missing at"`; stderr includes `"git worktree add"`; stderr includes `"patch-branch"`.
- Restore worktree via `git worktree add savedPath lock.branch`.

**15F (AC6 / AC12):** Branch pre-exists → `git worktree add` without `-b`.
- Release sess-15a (OFFLINE=1).
- Claim again with a different session and project name on same issue.
- Assert: new worktree directory exists and appears in `git worktree list --porcelain`.

---

### Epic Case 16: Worktree Lifecycle / Sweep / CWD-Protection (AC7–AC13 + 16H)

**Setup (shared):** `fs.mkdtempSync` → `git init -b main` → initial empty commit → `bin/gh` shim (pr view returns MERGED for issue-601 URLs, CLOSED for issue-602 URLs, OPEN otherwise; issue edit/comment/repo view exit 0; api returns `[]`).

Pre-provision:
- Claim issue-601 (`sess-16-merged`) with `--sink pr` (OFFLINE=1); inject `pr_url` + `sink: 'pr'` into lock.
- Claim issue-602 (`sess-16-closed`) with `--sink pr` (OFFLINE=1); inject same.

**16A (AC7):** watch-pr MERGED removes worktree.
- Assert worktree for issue-601 exists.
- Run `watch-pr` (full env with gh shim).
- Assert: lock file for issue-601 gone; worktree directory gone.

**16B (AC8):** watch-pr CLOSED removes worktree but does NOT delete branch.
- Assert worktree for issue-602 gone (processed in same watch-pr run as 16A).
- Assert: lock for issue-602 gone; worktree gone.
- If `lock602.branch` non-null: confirm watch-pr did NOT call `git branch -D` (branch may still exist in local repo).

**16C (AC9 — dirty worktree abandoned):**
- Claim issue-603 (`sess-16c`) OFFLINE; write a dirty file inside the worktree.
- Release sess-16c (OFFLINE=1) — note: `cmdRelease` should call `removeWorktree` when wired.
- Alternative if `cmdRelease` doesn't call `removeWorktree`: trigger via watch-pr with MERGED shim for issue-603.
- Assert: an `.abandoned-*` directory exists alongside the original worktree path.

**16D (AC10 — CWD-protection defers removal) — ADVISOR CORRECTION #5:**
- Claim issue-604 (`sess-16d`) OFFLINE.
- Read `wtPath604` from lock.
- **Trigger via `watch-pr` with cwd `wtPath604` and a MERGED gh shim for issue-604** (not `claim release` — `claim release` does not call `removeWorktree`).
- Assert: either a `.pending-removal/issue-604.json` entry exists under coordRoot, OR the worktree directory is still present (deferral confirmed).

**16E (AC11 — drain on sweep):**
- Using deferred state from 16D: run `sweep` with `cwd: epic16Tmp` (not inside the worktree).
- Assert: worktree for issue-604 is gone OR the `.pending-removal/issue-604.json` entry is deleted.

**16F (AC12 — sweep calls `git worktree prune`):**
- Add an orphan branch and `git worktree add orphanPath orphanBranch`.
- `fs.rmSync(orphanPath)` without `git worktree remove` (creates a stale entry).
- Assert: orphanPath appears in `git worktree list --porcelain` before sweep.
- Run `sweep` (OFFLINE=1).
- Assert: orphanPath no longer in `git worktree list --porcelain`.

**16G (AC13 — sink-merge removes worktree before branch delete):**
- Claim issue-605 (`sess-16g`) OFFLINE.
- Assert worktree exists.
- Run `kaola-workflow-sink-merge.js --branch lock605.branch --project issue-605 --issue 605` (OFFLINE=1).
- Assert: worktree directory no longer exists.

**16H (AC9 — pre-commit hook blocks cross-worktree commit) — ADVISOR CORRECTION #1:**
- New sub-case added by advisor: validates that `--git-common-dir` resolves to the shared `.git/` directory and the lock-presence check works from a linked worktree.
- Setup: create a temp repo; claim project-A as session-A; `git worktree add wtB someBranch`.
- From `cwd: wtB`, attempt `git commit --allow-empty -m test` with the pre-commit hook installed.
- Assert: exit code is non-zero (hook blocks the commit because project-A's lock is visible via `COORD_ROOT`).
- Note: requires the hook to be installed in the temp repo (symlink or copy `hooks/kaola-workflow-pre-commit.sh` to `tmpRepo/.git/hooks/pre-commit`).

---

## Advisor Notes

From `.cache/advisor-plan.md` (verdict: "Blueprint is substantially sound. Apply 6 corrections before Phase 4. No architect-revision pass needed."):

1. **AC9 pre-commit cross-worktree blocking test (16H)**: Added as sub-case 16H — validates `--git-common-dir` resolves to shared `.git/` and lock presence is visible cross-worktree. Applied above.

2. **`migrateLegacyCoordState` idempotency fix**: Original blueprint used `fs.renameSync` which atomically replaces destination on POSIX — stale legacy lock could clobber a fresh new-path lock. Fixed to use `fs.linkSync` (EEXIST = already migrated → skip) + `fs.unlinkSync`; on EXDEV cross-filesystem fallback with O_EXCL `openSync`. Applied in PR1-2.

3. **EEXIST retry in `cmdClaim` is a behavioral regression**: Original blueprint added a 3-attempt EEXIST retry loop. EEXIST on O_EXCL means another session holds the lock — retrying changes claim semantics. Removed. Single O_EXCL attempt only. Applied in PR2-3+4.

4. **PR2-3 + PR2-4 must be one atomic task**: PR2-3 started with `writeLockFile`; PR2-4 inserted resume-detection "before step 1." These splice the same `cmdClaim` block — merged into Task PR2-3+4 with resume-detection explicitly placed after `migrateLegacyCoordState` and before `writeLockFile`. Applied above.

5. **Sub-case 16D triggers the wrong path**: `claim release` does not call `removeWorktree`. Changed trigger to `watch-pr` with `cwd: wtPath604` and a MERGED gh shim. Applied in 16D spec above.

6. **Shell pwd grace was dropped**: Phase 2 advisor required this in-scope OR explicit follow-up issue. Decision: create a follow-up issue. Recorded in "Items Deferred" section above.

Additional important notes (not blocking):
- AC sub-case number reuse avoided — each sub-case uses one canonical AC.
- `localOwnerLiveness` and `handleTiebreakerYield` signature changes made explicit in PR1-5.
- EXDEV fallback detail placed in PR1-2 implementation spec (not just edge-case list).

---

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | advisor said "No architect-revision pass needed; encode corrections directly into phase3-plan.md" | Advisor explicitly routed to write-phase-file step |
