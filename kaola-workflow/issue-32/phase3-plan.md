# Phase 3 - Plan: issue-32

## Blueprint

### Files to Create
None. All changes target existing files.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/simulate-workflow-walkthrough.js` | Add `cwd: tmp` to AC3/AC7/AC8 spawnSync; add defensive stray-dir cleanup in outer `main()` finally; add synthetic-sweep test block; add structural assertions for Gap 1+2 patterns | Gap 3-A fix + TDD RED tests for T2/T3/T4 |
| `scripts/kaola-workflow-claim.js` | Add `UUID4_RE` + `isSyntheticTestSession` after `shouldSweep` (~line 578); gate both `shouldSweep` and `isRemoteStale` in `cmdSweep` (~lines 1809-1810) | Gap 3-B: synthetic session sweep |
| `commands/kaola-workflow-phase6.md` | Step 3: add ACTIVE_WORKTREE_PATH bash prelude + update doc-updater invocation prose; artifact mirror block after cross-session guard; update commit gate fence with re-resolved ACTIVE_WORKTREE_PATH and `git -C` | Gap 1+2: worktree routing for doc-updater + artifact mirror |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | Mirror identical Step 3 + Step 8 changes adapted for SKILL.md structure (`${KAOLA_PROJECT}` vars, fence positions) | Gap 1+2: Codex skill parity |

### Build Sequence
1. T1 — walkthrough test changes (RED): cwd fixes, synthetic-sweep test, structural assertions, defensive cleanup
2. T2 — claim.js predicate (GREEN for T1 synthetic-sweep): `isSyntheticTestSession` + cmdSweep gate
3. T3/T4 — phase6.md + SKILL.md edits (GREEN for T1 structural assertions): parallel since disjoint files
4. Validate — `node scripts/simulate-workflow-walkthrough.js` exits 0

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| D (first) | T1 | Must complete before A/B/C — writes failing tests |
| A | T2 | Modifies only `kaola-workflow-claim.js` |
| B | T3 | Modifies only `commands/kaola-workflow-phase6.md` |
| C | T4 | Modifies only `plugins/.../SKILL.md` |
| Validate | all | Run after A+B+C complete |

A, B, C can run concurrently (disjoint write sets).

### External Dependencies
None new. Uses existing: `fs`, `path`, `os`, `child_process.spawnSync`, `git -C`, `cp`.

---

## Task List

### Task 1: Walkthrough test additions (RED + Gap 3-A cwd fix)
- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: self
- Write Set: lines 3994, 4010, 4018 (cwd: tmp); new synthetic-sweep test block before closing `console.log`; outer `main()` finally stray-dir cleanup; structural assertion blocks
- Depends On: none
- Parallel Group: D (first)
- Action: MODIFY
- Implement:
  1. Add `cwd: tmp` to spawnSync options at lines 3994 (AC3), 4010 (AC7), 4018 (AC8).
  2. After `fs.rmSync(tmp, ...)` in outer `main()` finally (~line 4344), add defensive cleanup:
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
  3. Add synthetic-sweep test block before closing `console.log` (full spec below).
  4. Add structural assertion blocks for Gap 1+2: assert strings `ACTIVE_WORKTREE_PATH=`, `Mirror MUST run after`, `git -C "$ACTIVE_WORKTREE_PATH"` are present in both `commands/kaola-workflow-phase6.md` and `SKILL.md`.
- Validate: `node scripts/simulate-workflow-walkthrough.js` (expect failures on new assertions)

**Synthetic-sweep test block:**
```js
// Gap3-B: synthetic session sweep
const sweepTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaola-workflow-sweep-'));
try {
  const locksDir = path.join(sweepTmp, 'kaola-workflow', '.locks');
  fs.mkdirSync(locksDir, { recursive: true });
  const syntheticLock = { project: 'proj-synthetic', session_id: 'synthetic-test-sid',
    machine_id: 'm1', claimed_at: new Date().toISOString(),
    expires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    last_heartbeat: new Date().toISOString(), issue_number: null, claim_comment_id: null, sink: 'merge' };
  fs.writeFileSync(path.join(locksDir, 'proj-synthetic.lock'), JSON.stringify(syntheticLock, null, 2) + '\n');
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

---

### Task 2: claim.js synthetic sweep predicate (GREEN)
- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Task 1 synthetic-sweep block)
- Write Set: insertion after `shouldSweep` (~line 578); edit in `cmdSweep` (~lines 1809-1810)
- Depends On: Task 1
- Parallel Group: A
- Action: MODIFY
- Implement:
  After `shouldSweep` function (~line 578), insert:
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
- Mirror: additive pattern (does not modify `shouldSweep`)
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task 3: phase6.md Gap 1 + Gap 2 edits (GREEN for structural tests)
- File: `commands/kaola-workflow-phase6.md`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Task 1 structural assertions)
- Write Set: Step 3 prelude (bash block + prose), Step 8 mirror block (new bash fence), commit gate fence update (ACTIVE_WORKTREE_PATH prelude + `git -C`)
- Depends On: Task 1
- Parallel Group: B (parallel with Task 4)
- Action: MODIFY

**Variables note:** `commands/kaola-workflow-phase6.md` uses `{project}` markdown template substitution (NOT `$KAOLA_PROJECT`). All new bash blocks must use `{project}` literally for project-scoped paths.

**Insertion 1 — Step 3 ACTIVE_WORKTREE_PATH prelude** (insert new bash fence before "Write agent output to:" at ~line 303, inside Step 3):
```bash
# Resolve linked worktree path for this session
_COORD_ROOT_RAW="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
if [[ "$_COORD_ROOT_RAW" != /* ]]; then _COORD_ROOT_RAW="$(pwd)/$_COORD_ROOT_RAW"; fi
_LOCK_FILE="${_COORD_ROOT_RAW}/kaola-workflow/.locks/{project}.lock"
ACTIVE_WORKTREE_PATH=""
if [ -f "$_LOCK_FILE" ]; then
  ACTIVE_WORKTREE_PATH="$(node -e "try{const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(d.worktree_path||'');}catch(e){}" "$_LOCK_FILE" 2>/dev/null)" || true
fi
[ -z "$ACTIVE_WORKTREE_PATH" ] && ACTIVE_WORKTREE_PATH="$(pwd)"
```
Then update the doc-updater invocation prose to include: `Working directory: ${ACTIVE_WORKTREE_PATH}`

**Insertion 2 — Step 8 artifact-mirror block** (insert new bash fence AFTER "Do not attempt to bypass this guard." (~line 510) and BEFORE "## Step 8 - Commit Gate" (~line 512)):
```bash
# Artifact mirror: copy Phase 6 artifacts from main worktree to linked worktree.
# Mirror MUST run after all Phase 6 artifact writes.
_COORD_ROOT_RAW="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
if [[ "$_COORD_ROOT_RAW" != /* ]]; then _COORD_ROOT_RAW="$(pwd)/$_COORD_ROOT_RAW"; fi
_LOCK_FILE="${_COORD_ROOT_RAW}/kaola-workflow/.locks/{project}.lock"
ACTIVE_WORKTREE_PATH="$(pwd)"
if [ -f "$_LOCK_FILE" ]; then
  _WT="$(node -e "try{const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(d.worktree_path||'');}catch(e){}" "$_LOCK_FILE" 2>/dev/null)" || true
  [ -n "$_WT" ] && [ -d "$_WT" ] && ACTIVE_WORKTREE_PATH="$_WT"
fi
if [ "$ACTIVE_WORKTREE_PATH" != "$(pwd)" ]; then
  mkdir -p "$ACTIVE_WORKTREE_PATH/kaola-workflow/{project}/"
  cp -R "kaola-workflow/{project}/." "$ACTIVE_WORKTREE_PATH/kaola-workflow/{project}/"
  git status --porcelain | while IFS= read -r line; do
    f="${line:3}"
    case "$f" in kaola-workflow/*) continue;; esac
    if [ -f "$(pwd)/$f" ]; then
      mkdir -p "$ACTIVE_WORKTREE_PATH/$(dirname "$f")"
      cp "$(pwd)/$f" "$ACTIVE_WORKTREE_PATH/$f"
    fi
  done
fi
```

**Edit 3 — commit gate fence** (inside the existing Step 8 bash fence at ~lines 521-526): add ACTIVE_WORKTREE_PATH resolution prelude, then replace `git add` and `git commit` with `git -C "$ACTIVE_WORKTREE_PATH"` variants:
```bash
_COORD_ROOT_RAW="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
if [[ "$_COORD_ROOT_RAW" != /* ]]; then _COORD_ROOT_RAW="$(pwd)/$_COORD_ROOT_RAW"; fi
_LOCK_FILE="${_COORD_ROOT_RAW}/kaola-workflow/.locks/{project}.lock"
ACTIVE_WORKTREE_PATH="$(pwd)"
if [ -f "$_LOCK_FILE" ]; then
  _WT="$(node -e "try{const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(d.worktree_path||'');}catch(e){}" "$_LOCK_FILE" 2>/dev/null)" || true
  [ -n "$_WT" ] && [ -d "$_WT" ] && ACTIVE_WORKTREE_PATH="$_WT"
fi
git -C "$ACTIVE_WORKTREE_PATH" status --short
git -C "$ACTIVE_WORKTREE_PATH" add <approved-files-only>
git -C "$ACTIVE_WORKTREE_PATH" commit -m "chore: finalize {project}"
git -C "$ACTIVE_WORKTREE_PATH" status --short
```
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task 4: SKILL.md Gap 1 + Gap 2 edits (GREEN for structural tests)
- File: `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md`
- Test File: `scripts/simulate-workflow-walkthrough.js` (Task 1 structural assertions)
- Write Set: Step 3 bash prelude + prose update; Step 8 mirror block insertion (after line 130); commit gate fence update (ACTIVE_WORKTREE_PATH prelude + `git -C`)
- Depends On: Task 1
- Parallel Group: C (parallel with Task 3)
- Action: MODIFY

**Variables note:** SKILL.md uses `${KAOLA_PROJECT}` shell variable (already set in calling context). All new bash blocks use `${KAOLA_PROJECT}` for project-scoped paths.

**Insertion 1 — Step 3 ACTIVE_WORKTREE_PATH prelude** (insert new bash fence before numbered item 3 at ~line 74, which is the doc-updater step):
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
Update the doc-updater role description to include: `Working directory: ${ACTIVE_WORKTREE_PATH}`

**Insertion 2 — Step 8 artifact-mirror block** (insert new bash fence AFTER "Do not attempt to bypass this guard." at line 130, before "Before sink dispatch..." at line 132):
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
  mkdir -p "$ACTIVE_WORKTREE_PATH/kaola-workflow/${KAOLA_PROJECT}/"
  cp -R "kaola-workflow/${KAOLA_PROJECT}/." "$ACTIVE_WORKTREE_PATH/kaola-workflow/${KAOLA_PROJECT}/"
  git status --porcelain | while IFS= read -r line; do
    f="${line:3}"
    case "$f" in kaola-workflow/*) continue;; esac
    if [ -f "$(pwd)/$f" ]; then
      mkdir -p "$ACTIVE_WORKTREE_PATH/$(dirname "$f")"
      cp "$(pwd)/$f" "$ACTIVE_WORKTREE_PATH/$f"
    fi
  done
fi
```

**Edit 3 — commit gate fence** (inside existing bash fence at lines 136-141): add ACTIVE_WORKTREE_PATH resolution prelude, then replace `git add` / `git commit` with `git -C "$ACTIVE_WORKTREE_PATH"`:
```bash
_COORD_ROOT_RAW="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
if [[ "$_COORD_ROOT_RAW" != /* ]]; then _COORD_ROOT_RAW="$(pwd)/$_COORD_ROOT_RAW"; fi
_LOCK_FILE="${_COORD_ROOT_RAW}/kaola-workflow/.locks/${KAOLA_PROJECT}.lock"
ACTIVE_WORKTREE_PATH="$(pwd)"
if [ -f "$_LOCK_FILE" ]; then
  _WT="$(node -e "try{const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.stdout.write(d.worktree_path||'');}catch(e){}" "$_LOCK_FILE" 2>/dev/null)" || true
  [ -n "$_WT" ] && [ -d "$_WT" ] && ACTIVE_WORKTREE_PATH="$_WT"
fi
git -C "$ACTIVE_WORKTREE_PATH" status --short
git -C "$ACTIVE_WORKTREE_PATH" add <approved-files-only>
git -C "$ACTIVE_WORKTREE_PATH" commit -m "chore: finalize ${KAOLA_PROJECT}"
git -C "$ACTIVE_WORKTREE_PATH" status --short
```
- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

## Advisor Notes

- **Fix 1 (variable binding):** `commands/kaola-workflow-phase6.md` uses `{project}` template literal; `SKILL.md` uses `${KAOLA_PROJECT}`. Architect blueprint used `${KAOLA_PROJECT}` in both — corrected in this plan.
- **Fix 2 (mirror loop):** `git diff --name-only HEAD` replaced with `git status --porcelain` + `[ -f ]` guard to handle untracked new files and skip deletions correctly.
- **Retraction:** Pre-mirror linked-worktree status check dropped. Overwrite-always policy is sufficient; blocking on non-empty linked worktree would prevent the mirror from running in the normal case.
- **Shell isolation:** `ACTIVE_WORKTREE_PATH` resolution prelude is duplicated inside the commit gate fence (separate bash fences cannot share shell state).
- **Structural anchors:** T1 structural assertions target `ACTIVE_WORKTREE_PATH=` (assignment), `Mirror MUST run after`, and `git -C "$ACTIVE_WORKTREE_PATH"` for reliable grep-based verification.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | — | Advisor corrections incorporated directly; no structural gaps requiring full re-architecture |
