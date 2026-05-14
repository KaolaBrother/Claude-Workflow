# Code Architect: claim-hardening

## Design Decisions

- **Edit strategy — anchor-based, not line-addressed.** All six claim.js edits use unique old-string anchors, not raw line numbers. This eliminates shift errors caused by earlier insertions displacing later line numbers.
- **Bottom-up edit order within claim.js.** When a single file receives multiple inserts/additions, work highest-line-number first (330 → 231 → 171 → 153 → 143 → 123). Each edit's old-string is still in its original position when the change is applied.
- **TDD ordering.** Write test first (RED), verify failure, then apply the claim.js fix (GREEN). Exception: 8E (M1 probe) — write test, run GREEN-or-RED, only add code fix if RED.
- **Shared helper to stay inside line budget.** A small `runClaim` helper inside Epic Case 8 reduces per-test boilerplate.
- **8C caveat noted.** 8C is a regression assertion, not RED→GREEN discriminator. In OFFLINE mode claim_comment_id is null, and `null || 'N/A'` already produces 'N/A'. Test documents intent and prevents future regression.

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | 6 surgical edits: S-L2 (buildSinkBlock/leaseBlock), M2 (updateLeaseInPlace), S-L1a (openSync), S-L1b (writeFileSync session), S-L1c (writeFileSync lock re-write), INFO (cmdStatus guard) | P1 |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Case 8 block (sub-tests 8A–8E) and `runClaim` helper function | P1 |

No files to create. No other files touched.

---

## Build Sequence

```
0. Task 0  → Add runClaim helper to test file; verify old suite still green
1. Tasks 1a+2a+3a+4a → Write sub-tests 8A, 8B, 8C, 8E (can author in parallel, serialize writes)
5. Verify new sub-tests are RED (or regression-only for 8C)
6. Task 1c → Apply claim.js fixes: INFO early-return (330), S-L1c (231), S-L1b (171), S-L1a (153) — in that bottom-up order
7. Task 2b → Apply M2 fix (143)     [after step 6 — same file, serialize]
8. Task 3b → Apply S-L2 fix (123)   [after step 7 — same file, serialize]
9. Verify all tests GREEN: node scripts/simulate-workflow-walkthrough.js
10. Task 4b → Interpret 8E result
11. Task 4c (conditional) → If RED: apply M1 regex fix, re-run, verify GREEN
```

---

## Parallelization Plan

| Parallel Group | Tasks | Can Parallelize With | Cannot Parallelize With |
|----------------|-------|----------------------|-------------------------|
| A (test authoring) | Task 1a (8A+8D) | B, C, D | claim.js writes in steps 6–8 |
| B (test authoring) | Task 2a (8B) | A, C, D | claim.js writes in steps 6–8 |
| C (test authoring) | Task 3a (8C) | A, B, D | claim.js writes in steps 6–8 |
| D (test authoring) | Task 4a (8E) | A, B, C | claim.js writes in steps 6–8 |
| claim.js writes | Steps 6–8 (Tasks 1c, 2b, 3b) | — | Each other (same file, serialize) |
| M1 conditional | Task 4c | — | Any other claim.js edit (serialize last) |

---

## Task List

### Task 0 — `runClaim` helper

- **File:** `scripts/simulate-workflow-walkthrough.js`
- **Test File:** N/A
- **Write Set:** `simulate-workflow-walkthrough.js`
- **Depends On:** none
- **Parallel Group:** prerequisite
- **Action:** MODIFY
- **Implement:** Add local helper `runClaim(workdir, sessionId, issue, project)` at the top of the Epic Case 8 block (after Epic Case 7 finally block closes, before the final `console.log('Workflow walkthrough simulation passed')`). The function calls `execFileSync(process.execPath, [claimScript, 'claim', '--session', sessionId, '--project', project, '--issue', String(issue)], { cwd: workdir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, HOME: workdir, KAOLA_WORKFLOW_OFFLINE: '1' } })`. Returns `{ lockPath, statePath }` computed from `workdir`.
- **Mirror:** `epicTmp` + `execFileSync` pattern from Epic Case 1 (lines 330–408)
- **Validate:** `node scripts/simulate-workflow-walkthrough.js`

---

### Task 1 — Tests 8A + 8D (RED), then S-L1a, S-L1b, S-L1c, INFO fixes (GREEN)

- **File:** `scripts/kaola-workflow-claim.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js`
- **Write Set:** `claim.js` (4 edit anchors); `simulate-workflow-walkthrough.js` (8A+8D blocks)
- **Depends On:** Task 0
- **Parallel Group:** A (test authoring)
- **Action:** MODIFY

**Test 8A (file permissions):**
- Create `epic8Tmp`. Run `runClaim(epic8Tmp, sessionId, 3, 'epic8-proj')`.
- Wrap in `if (process.platform !== 'win32')`.
- Assert `(fs.statSync(lockPath).mode & 0o777) === 0o600` — `'8A: lock file mode must be 0o600'`
- Assert `(fs.statSync(sessionPath).mode & 0o777) === 0o600` — `'8A: session file mode must be 0o600'`
- Expect RED before fix (modes are 0o644).

**Test 8D (cmdStatus unsafe session_id skip):**
- Create `kaola-workflow/.locks/epic8d.lock` with JSON: `{ project: 'epic8d', session_id: '../../../etc/passwd', expires: <future ISO>, last_heartbeat: <now ISO>, claimed_at: <now ISO> }`.
- Run `spawnSync(process.execPath, [claimScript, 'status', '--json'], { cwd: epic8dTmp, encoding: 'utf8', env: { ...process.env, HOME: epic8dTmp, KAOLA_WORKFLOW_OFFLINE: '1' } })`.
- Assert `r.status === 0`.
- Assert the entry is absent from normal results OR its drift array includes `'session_id unsafe'`.
- Expect RED before fix (no guard; `readSessionFile` called with unsafe path).

**claim.js fixes (bottom-up order):**

Fix INFO (line 330 — inside `cmdStatus` `.map()` callback):
- **NOTE:** The loop at line 329 uses `.map()`, not `forEach`/`for...of`. `continue` is a syntax error inside `.map()`. Use early `return` with a stub entry instead.
- old_string: `const session = readSessionFile(root, lock.session_id);`
- new_string:
  ```
  if (!isSafeName(lock.session_id)) {
        return { session: null, lock, remote: { assignee: null, has_label: null, sentinel_comment_id: null }, consistent: false, drift: ['session_id unsafe'] };
      }
      const session = readSessionFile(root, lock.session_id);
  ```

Fix S-L1c (line 231):
- old_string: `fs.writeFileSync(lp, JSON.stringify(finalLock, null, 2) + '\n');`  (inside `cmdClaim` `if (commentId !== null)` branch)
- new_string: `fs.writeFileSync(lp, JSON.stringify(finalLock, null, 2) + '\n', { mode: 0o600 });`

Fix S-L1b (line 171):
- old_string: `fs.writeFileSync(sessionPath(root, sessionId), JSON.stringify(sess, null, 2) + '\n');`
- new_string: `fs.writeFileSync(sessionPath(root, sessionId), JSON.stringify(sess, null, 2) + '\n', { mode: 0o600 });`

Fix S-L1a (line 153):
- old_string: `const fd = fs.openSync(lp, 'wx');`
- new_string: `const fd = fs.openSync(lp, 'wx', 0o600);`

- **Mirror (S-L1):** `fs.writeFileSync` with `{ mode: 0o600 }` is standard Node.js ≥12 API.
- **Mirror (INFO):** `cmdRelease` lines 247–248 (`assert(isSafeName(match.session_id))`); translated to non-throwing early return inside `.map()`.
- **Validate:** `node scripts/simulate-workflow-walkthrough.js`

---

### Task 2 — Test 8B (RED), then M2 fix (GREEN)

- **File:** `scripts/kaola-workflow-claim.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js`
- **Write Set:** `claim.js` anchor `if (!/^## Lease\s*$/m.test(content)) return;`; `simulate-workflow-walkthrough.js` (8B block)
- **Depends On:** Task 0
- **Parallel Group:** B (test authoring)
- **Action:** MODIFY

**Test 8B (stderr warning for missing ## Lease):**
- Create `epic8bTmp`. Create `kaola-workflow/.locks/epic8b.lock` with a valid lock JSON (project: 'epic8b', session_id: 'sess-8b', expires: future, last_heartbeat: now, claimed_at: now).
- Create `kaola-workflow/epic8b/workflow-state.md` with `## Project` and `## Current Position` sections but deliberately NO `## Lease` section.
- Use `spawnSync` to run heartbeat: `spawnSync(process.execPath, [claimScript, 'heartbeat', '--session', 'sess-8b'], { cwd: epic8bTmp, encoding: 'utf8', env: { ...process.env, HOME: epic8bTmp, KAOLA_WORKFLOW_OFFLINE: '1' } })`.
- Assert `r.stderr.includes('updateLeaseInPlace: ## Lease section missing in')`.
- Expect RED before fix (no stderr warning today).

**claim.js fix M2:**
- old_string: `if (!/^## Lease\s*$/m.test(content)) return;`
- new_string: `if (!/^## Lease\s*$/m.test(content)) { process.stderr.write('updateLeaseInPlace: ## Lease section missing in ' + stateFile + '\n'); return; }`
- Context: inside `updateLeaseInPlace` (line 143). The `if (!fs.existsSync(stateFile)) return;` at line 141 is unchanged.

- **Mirror:** `process.stderr.write('release: no lock found for session ' + sessionId + ... + '\n')` at line 243.
- **Validate:** `node scripts/simulate-workflow-walkthrough.js`

---

### Task 3 — Test 8C (regression), then S-L2 fix

- **File:** `scripts/kaola-workflow-claim.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js`
- **Write Set:** `claim.js` anchor `'claim_comment_id: ' + (lockData.claim_comment_id || 'N/A')`; `simulate-workflow-walkthrough.js` (8C block)
- **Depends On:** Task 0
- **Parallel Group:** C (test authoring)
- **Action:** MODIFY

**Test 8C (claim_comment_id renders as N/A in offline mode — regression guard):**
- CAVEAT: In OFFLINE mode claim_comment_id is null; `null || 'N/A'` already produces 'N/A'. After the fix, `/^\d+$/.test(null)` → false → 'N/A'. Test will pass both before and after fix. It exists to prevent future regression.
- Run `runClaim(epic8cTmp, sessId, 3, 'epic8c')`. Read the written workflow-state.md. Find line matching `/^claim_comment_id:\s*(.+)$/m`. Assert captured group is `'N/A'`.

**claim.js fix S-L2:**
The `claim_comment_id` field is in `leaseBlock` array inside `updateSinkLease` (line ~118–124):
- old_string (exact multi-line leaseBlock construction):
  ```
  const leaseBlock = [
      '\n## Lease',
      'session_id: ' + lockData.session_id,
      'expires: ' + lockData.expires,
      'last_heartbeat: ' + lockData.last_heartbeat,
      'claim_comment_id: ' + (lockData.claim_comment_id || 'N/A')
    ].join('\n');
  ```
- new_string: insert `const safeCommentId = /^\d+$/.test(lockData.claim_comment_id) ? lockData.claim_comment_id : 'N/A';` before the `const leaseBlock` declaration; replace `(lockData.claim_comment_id || 'N/A')` with `safeCommentId`.

- **Mirror:** `/^\d+$/.test(lock.claim_comment_id)` at line 386 in `cmdPatchBranch`.
- **Validate:** `node scripts/simulate-workflow-walkthrough.js`

---

### Task 4 — Test 8E (M1 probe), conditional fix

- **File:** `scripts/kaola-workflow-claim.js` (0 edits if GREEN; 1 edit if RED)
- **Test File:** `scripts/simulate-workflow-walkthrough.js`
- **Write Set:** `simulate-workflow-walkthrough.js` (8E block); conditionally `claim.js` lines 132–136
- **Depends On:** Task 0
- **Parallel Group:** D (test authoring)
- **Action:** MODIFY

**Test 8E (re-claim Sink refresh — realistic state file structure):**
1. Create `epic8eTmp`. Write `kaola-workflow/epic8e/workflow-state.md` with standard sections (Project, Current Position, Pending Gates, Ownership Rules, Last Evidence, Last Updated) but NO Sink/Lease.
2. Claim issue #3 → triggers "Sink doesn't exist" branch → appends `## Sink` + `## Lease` at end.
3. Release with `sessA`.
4. Claim issue #4 with `sessB` → triggers re-claim regex path (Sink already exists).
5. Read workflow-state.md. Assert:
   - `content.includes('issue_number: 4')` — `'8E: issue_number must be refreshed to 4'`
   - `content.match(/^claimed_at:\s*.+$/m)` truthy — `'8E: claimed_at must be present'`
   - `content.includes('## Project')`, `content.includes('## Current Position')`, etc. — `'8E: sibling sections must be preserved'`
   - `(content.match(/^## Sink\s*$/mg) || []).length === 1` — `'8E: exactly one ## Sink'`
   - `(content.match(/^## Lease\s*$/mg) || []).length === 1` — `'8E: exactly one ## Lease'`

**Probe result:**
- If GREEN: M1 already fixed. No claim.js change. Task 4 complete.
- If RED: apply surgical regex fix inside `updateSinkLease` (lines 132–136). The exact fix depends on the observed RED output — diagnose first, then apply minimum change to make 8E pass without breaking Epic Cases 1–7 and 8A–8D.

**Validate:** `node scripts/simulate-workflow-walkthrough.js`

---

## External Dependencies

None. All fixes use:
- `fs.openSync(path, flags, mode)` — Node.js ≥12 stdlib
- `fs.writeFileSync(path, data, { mode })` — Node.js ≥12 stdlib
- `process.stderr.write(str)` — Node.js stdlib
- Existing `isSafeName` function already in claim.js
- Existing `/^\d+$/` pattern already in claim.js

## Explicit Out-of-Scope

1. No new files to create
2. No new subcommands, CLI flags, or public API additions
3. No changes to any file under `commands/`
4. No `getMachineId` fix
5. No regex simplification in `updateSinkLease` unless 8E fails RED
6. No `assert()` in cmdStatus INFO fix — use silent early return inside `.map()` callback
7. No mode change at lines 290, 377, or 444 — re-writes inherit creation-time mode
8. `simulate-workflow-walkthrough.js` must stay under 1150 lines after all additions
9. No changes to cmdRelease, cmdHeartbeat, cmdSweep, writeLockFile, cmdPatchBranch, cmdWatchPr, or any function not in the Items list
