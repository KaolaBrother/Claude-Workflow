# Code Architect Cache — issue-32

## Design Decisions

- No new files: all three gaps are fixed by editing existing files only.
- Gap 1 uses two enforcement layers (hint + guarantee): bash prelude injects `ACTIVE_WORKTREE_PATH` into doc-updater prompt (best-effort), and the Step 8 broader mirror is the guarantee.
- Gap 2 uses `git -C "$ACTIVE_WORKTREE_PATH"` for all git operations in new bash blocks, not `cd`, because Phase 6 bash blocks in both markdown files execute in isolated shell contexts — `cd` in one block does not carry over.
- Gap 3-B sweep predicate uses `isSyntheticTestSession` as an additive bypass, not a replacement of `shouldSweep` or `isRemoteStale`.
- Gap 3-A adds `cwd: tmp` to AC3/AC7/AC8 spawnSync calls.
- Tests for Gap 3-B follow TDD: write failing test first, then add predicate.
- Structural grep-assertions in simulate-walkthrough.js confirm the required patterns are present in the markdown files (no E2E tests for Gaps 1+2).

---

## Files to Create
None. All changes are to existing files.

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | Add `isSyntheticTestSession` predicate after `shouldSweep` (~line 578); edit `cmdSweep` loop body (~lines 1809-1810) to bypass time-gates for synthetic sessions | HIGH |
| `scripts/simulate-workflow-walkthrough.js` | Add `cwd: tmp` to AC3 (line 3994), AC7 (line 4010), AC8 (line 4018) spawnSync calls; add defensive stray-dir cleanup in outer `main()` finally; add synthetic-sweep test block before closing `console.log`; add structural assertion blocks for Gap 1+2 patterns | HIGH |
| `commands/kaola-workflow-phase6.md` | Step 3: insert ACTIVE_WORKTREE_PATH prelude before doc-updater invocation; Step 8: insert artifact-mirror block after cross-session guard and before commit gate; update `git add`/`git commit` to use `git -C "$ACTIVE_WORKTREE_PATH"` | HIGH |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Step 3 equivalent: insert ACTIVE_WORKTREE_PATH prelude at doc-updater step (~line 74); Step 8 equivalent: insert artifact-mirror block after cross-session guard (~after line 130); update `git -C` in commit gate | HIGH |

---

## Data Flow

**Gap 1 (doc-updater worktree routing):**
- Lock file at `$coordRoot/kaola-workflow/.locks/$KAOLA_PROJECT.lock` contains `worktree_path`
- A new bash block before the doc-updater invocation reads `worktree_path` from the lock file and exports `ACTIVE_WORKTREE_PATH`
- The doc-updater agent prompt receives `Working directory: ${ACTIVE_WORKTREE_PATH}` so it writes to the linked worktree, not main

**Gap 2 (phase artifacts in main worktree):**
- After the cross-session guard, a new bash block reads `worktree_path` from the lock file using `git rev-parse --git-common-dir`
- `kaola-workflow/$KAOLA_PROJECT/` is verified clean in linked worktree before mirroring
- `cp -R "kaola-workflow/$KAOLA_PROJECT/" "$ACTIVE_WORKTREE_PATH/kaola-workflow/$KAOLA_PROJECT/"` copies artifacts from main to linked worktree
- Subsequent `git add`/`git commit` use `git -C "$ACTIVE_WORKTREE_PATH"` for linked worktree index
- Mirror runs after all Phase 6 artifact writes, before `git add`
- `cmdClaim` at line 1383 is untouched

**Gap 3 (test cleanup + synthetic sweep):**
- `isSyntheticTestSession(lock)` returns true when `lock.session_id` does not match UUID4 regex
- `cmdSweep` treats synthetic sessions as immediately sweepable, bypassing both gates
- AC3/AC7/AC8 tests gain `cwd: tmp` so artifacts land in `tmp` not the real repo root
- Outer `main()` finally adds defensive pass removing any `kaola-workflow/proj-ac*/` from `process.cwd()`

---

## Build Sequence (TDD order)

1. **T1 + T3 + T4 — Write all walkthrough test changes (RED):** Add synthetic-sweep test block, add `cwd: tmp` to three spawnSync calls, add defensive cleanup, add structural assertion blocks. Run — synthetic-sweep and structural assertions fail RED.
2. **T2 — claim.js predicate (GREEN for T1):** Add `UUID4_RE` + `isSyntheticTestSession` after `shouldSweep`; edit `cmdSweep` body. Synthetic-sweep test turns GREEN.
3. **T5 — phase6.md edits (GREEN for T4 structural tests):** Add ACTIVE_WORKTREE_PATH prelude at Step 3; add artifact-mirror block; update git commands.
4. **T6 — SKILL.md edits (GREEN for T4 structural tests):** Mirror identical changes.
5. **Validate:** `node scripts/simulate-workflow-walkthrough.js` exits 0, no stray `proj-ac*` dirs.

---

## Task List

### Task 1: Walkthrough test additions (RED + Gap 3-A cwd fix)
- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: self
- Write Set: lines 3994, 4010, 4018 (cwd: tmp); new blocks before closing console.log; outer finally stray-dir cleanup
- Depends On: none
- Parallel Group: D (first)
- Action: MODIFY
- Implement:
  1. Add `cwd: tmp` to spawnSync options at lines 3994 (AC3), 4010 (AC7), 4018 (AC8)
  2. After `fs.rmSync(tmp, ...)` in outer `main()` finally (~line 4344), add defensive cleanup loop for `kaola-workflow/proj-ac*/` in `process.cwd()`
  3. Add synthetic-sweep test block (see spec below)
  4. Add structural assertion blocks for Gap 1+2 (assert `ACTIVE_WORKTREE_PATH`, `Mirror MUST run after`, `git -C "$ACTIVE_WORKTREE_PATH"` present in phase6.md and SKILL.md)
- Validate: `node scripts/simulate-workflow-walkthrough.js` (expect fail on new assertions)

**Synthetic-sweep test block spec:**
```js
// Gap3-B: synthetic session sweep
const sweepTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-sweep-'));
try {
  const locksDir = path.join(sweepTmp, 'kaola-workflow', '.locks');
  fs.mkdirSync(locksDir, { recursive: true });
  // Synthetic session (non-UUID4) — should be swept
  const syntheticLock = { project: 'proj-synthetic', session_id: 'synthetic-test-sid',
    machine_id: 'm1', claimed_at: new Date().toISOString(),
    expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    last_heartbeat: new Date().toISOString(), issue_number: null, claim_comment_id: null, sink: 'merge' };
  fs.writeFileSync(path.join(locksDir, 'proj-synthetic.lock'), JSON.stringify(syntheticLock, null, 2) + '\n');
  // Real UUID4 session with fresh timestamps — must NOT be swept
  const realSid = '12345678-1234-4234-89ab-123456789abc';
  const realLock = { project: 'proj-real', session_id: realSid, machine_id: 'm1',
    claimed_at: new Date().toISOString(), expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    last_heartbeat: new Date().toISOString(), issue_number: null, claim_comment_id: null, sink: 'merge' };
  fs.writeFileSync(path.join(locksDir, 'proj-real.lock'), JSON.stringify(realLock, null, 2) + '\n');
  spawnSync(process.execPath, [claimScript, 'sweep'], {
    encoding: 'utf8', cwd: sweepTmp,
    env: { ...process.env, HOME: sweepTmp, KAOLA_WORKFLOW_OFFLINE: '1', KAOLA_COORD_ROOT: sweepTmp }
  });
  assert(!fs.existsSync(path.join(locksDir, 'proj-synthetic.lock')), 'Gap3-B: synthetic-session lock must be swept');
  assert(fs.existsSync(path.join(locksDir, 'proj-real.lock')), 'Gap3-B: UUID4-session lock with fresh timestamps must NOT be swept');
} finally {
  fs.rmSync(sweepTmp, { recursive: true, force: true });
}
```

**Defensive cleanup spec:**
```js
try {
  const cwdKw = path.join(process.cwd(), 'kaola-workflow');
  if (fs.existsSync(cwdKw)) {
    for (const d of fs.readdirSync(cwdKw)) {
      if (/^proj-ac/.test(d)) {
        fs.rmSync(path.join(cwdKw, d), { recursive: true, force: true });
      }
    }
  }
} catch (_) {}
```

---

### Task 2: claim.js synthetic sweep predicate (GREEN)
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Task 1 synthetic-sweep block)
- Write Set: 2 insertion points in `kaola-workflow-claim.js`
- Depends On: Task 1
- Parallel Group: A
- Action: MODIFY
- Implement:
  After `shouldSweep` function (~line 578), add:
  ```js
  const UUID4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Design intent: all production session_ids come from crypto.randomUUID() (UUID4 only).
  // Any non-UUID4 session_id is treated as synthetic/test and swept unconditionally.
  function isSyntheticTestSession(lock) {
    return !lock || !lock.session_id || !UUID4_RE.test(String(lock.session_id));
  }
  ```
  In `cmdSweep` replace:
  ```js
  if (!shouldSweep(lock)) continue;
  if (!isRemoteStale(lock)) continue;
  ```
  with:
  ```js
  const synthetic = isSyntheticTestSession(lock);
  if (!synthetic && !shouldSweep(lock)) continue;
  if (!synthetic && !isRemoteStale(lock)) continue;
  ```
- Mirror: `shouldSweep` additive pattern
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task 3: phase6.md Gap 1 + Gap 2 edits (GREEN for structural tests)
- File: `commands/kaola-workflow-phase6.md`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Task 1 structural assertions)
- Write Set: Step 3 prelude, Step 8 mirror block, `git -C` updates in commit gate
- Depends On: Task 1
- Parallel Group: B
- Action: MODIFY
- Implement:

  **Step 3 ACTIVE_WORKTREE_PATH prelude (insert before doc-updater invocation):**
  ```bash
  # Resolve linked worktree path for this session
  _COORD_ROOT_RAW="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
  if [[ "$_COORD_ROOT_RAW" != /* ]]; then _COORD_ROOT_RAW="$(pwd)/$_COORD_ROOT_RAW"; fi
  _LOCK_FILE="${_COORD_ROOT_RAW}/kaola-workflow/.locks/${KAOLA_PROJECT}.lock"
  ACTIVE_WORKTREE_PATH=""
  if [ -f "$_LOCK_FILE" ]; then
    ACTIVE_WORKTREE_PATH="$(node -e "try{const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(d.worktree_path||'');}catch(e){}" "$_LOCK_FILE" 2>/dev/null)" || true
  fi
  [ -z "$ACTIVE_WORKTREE_PATH" ] && ACTIVE_WORKTREE_PATH="$(pwd)"
  ```
  Then when invoking doc-updater, include: `Working directory: ${ACTIVE_WORKTREE_PATH}`

  **Step 8 artifact-mirror block (insert after cross-session guard, before commit gate):**
  ```bash
  # Artifact mirror: copy Phase 6 artifacts from main worktree to linked worktree.
  # Mirror MUST run after all Phase 6 artifact writes.
  _COORD_ROOT_RAW="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
  if [[ "$_COORD_ROOT_RAW" != /* ]]; then _COORD_ROOT_RAW="$(pwd)/$_COORD_ROOT_RAW"; fi
  _LOCK_FILE="${_COORD_ROOT_RAW}/kaola-workflow/.locks/${KAOLA_PROJECT}.lock"
  ACTIVE_WORKTREE_PATH="$(pwd)"
  if [ -f "$_LOCK_FILE" ]; then
    _WT="$(node -e "try{const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(d.worktree_path||'');}catch(e){}" "$_LOCK_FILE" 2>/dev/null)" || true
    [ -n "$_WT" ] && [ -d "$_WT" ] && ACTIVE_WORKTREE_PATH="$_WT"
  fi
  if [ "$ACTIVE_WORKTREE_PATH" != "$(pwd)" ]; then
    _WT_STATUS="$(git -C "$ACTIVE_WORKTREE_PATH" status --porcelain "kaola-workflow/${KAOLA_PROJECT}/" 2>/dev/null || true)"
    if [ -n "$_WT_STATUS" ]; then
      echo "BLOCKED: linked worktree has uncommitted changes — resolve before mirroring." >&2; exit 1
    fi
    mkdir -p "$ACTIVE_WORKTREE_PATH/kaola-workflow/${KAOLA_PROJECT}/"
    cp -R "kaola-workflow/${KAOLA_PROJECT}/." "$ACTIVE_WORKTREE_PATH/kaola-workflow/${KAOLA_PROJECT}/"
    # Also copy any other tracked changes (doc files from doc-updater)
    git diff --name-only HEAD | while IFS= read -r f; do
      case "$f" in kaola-workflow/*) continue;; esac
      mkdir -p "$ACTIVE_WORKTREE_PATH/$(dirname "$f")"
      cp "$(pwd)/$f" "$ACTIVE_WORKTREE_PATH/$f"
    done
    # Sanity check
    _MAIN_DIFF="$(git -C "$(pwd)" diff --name-only HEAD 2>/dev/null || true)"
    _WT_DIFF="$(git -C "$ACTIVE_WORKTREE_PATH" diff --name-only HEAD 2>/dev/null || true)"
    if [ -n "$_MAIN_DIFF" ] && [ -z "$_WT_DIFF" ]; then
      echo "BLOCKED: main worktree has tracked diff but linked worktree does not after mirror." >&2; exit 1
    fi
  fi
  ```
  Update commit gate: replace `git add ...` with `git -C "$ACTIVE_WORKTREE_PATH" add ...`, replace `git commit ...` with `git -C "$ACTIVE_WORKTREE_PATH" commit ...`
- Mirror: `git -C` pattern from existing sink-merge.js
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task 4: SKILL.md Gap 1 + Gap 2 edits (GREEN for structural tests)
- File: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Task 1 structural assertions)
- Write Set: Step 3 prelude, Step 8 mirror block, `git -C` in commit gate
- Depends On: Task 1
- Parallel Group: C (parallel with Task 3)
- Action: MODIFY
- Implement: Identical logic to Task 3, adapted to SKILL.md bash block structure. SKILL.md already has `cd "$KAOLA_WORKTREE_PATH" 2>/dev/null || true` in session heartbeat at line 44, but that CWD doesn't carry forward — use `git -C "$ACTIVE_WORKTREE_PATH"` explicitly.
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

## Parallelization Groups

| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| D (first) | T1 | Must complete before A/B/C — writes failing tests |
| A | T2 | Only modifies kaola-workflow-claim.js |
| B | T3 | Only modifies commands/kaola-workflow-phase6.md |
| C | T4 | Only modifies plugins/.../SKILL.md |
| Validate | all | Run after A+B+C complete |

A, B, C can run concurrently (disjoint write sets).

---

## External Dependencies
None new. All changes use existing: `fs`, `path`, `os`, `child_process.spawnSync`, `git -C`, `cp -R`.

---

## Missing Facts / Open Questions

1. `realpath` vs `cd && pwd` for COORD_ROOT normalization — use `if [[ "$RAW" != /* ]]; then RAW="$(pwd)/$RAW"; fi` pattern for portability (no `realpath` dependency).
2. Exact insertion line for SKILL.md doc-updater prelude — implementer must verify line 74 context.
3. Structural test strings must match exact wording used in T3/T4 edits — anchor on `ACTIVE_WORKTREE_PATH`, `Mirror MUST run after`, `git -C "$ACTIVE_WORKTREE_PATH"`.
4. `cp -R` on `.cache/` with large files — intentional; full artifact set travels together.
