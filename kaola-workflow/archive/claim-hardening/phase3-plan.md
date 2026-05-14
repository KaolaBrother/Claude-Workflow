# Phase 3 - Plan: claim-hardening

## Blueprint

### Files to Create
None.

### Files to Modify
| File | Changes | Why |
|------|---------|-----|
| `scripts/kaola-workflow-claim.js` | 6 surgical edits: INFO (line 330), S-L1c (line 231), S-L1b (line 171), S-L1a (line 153), M2 (line 143), S-L2 (line 123) | Fix 5 hardening items: isSafeName guard, file permissions 0600, claim_comment_id validation, updateLeaseInPlace warning |
| `scripts/simulate-workflow-walkthrough.js` | Add `runClaim` helper + Epic Case 8 block (sub-tests 8A–8E) | TDD coverage for all 5 hardening items |

### Build Sequence
1. Task 0 — Add `runClaim` helper; verify old suite still green (prerequisite for all tasks)
2. Tasks 1a, 2a, 3a, 4a — Write sub-tests 8A+8D, 8B, 8C, 8E (can author in parallel; serialize writes to test file)
3. Verify new sub-tests are RED (except 8C regression-only)
4. Task 1c — Apply claim.js fixes: INFO (330), S-L1c (231), S-L1b (171), S-L1a (153) — bottom-up order
5. Task 2b — Apply M2 fix (143) — after step 4 (same file, serialize)
6. Task 3b — Apply S-L2 fix (123) — after step 5 (same file, serialize)
7. Verify all tests GREEN: `node scripts/simulate-workflow-walkthrough.js`
8. Task 4b — Interpret 8E result; apply conditional M1 regex fix only if RED

### Parallelization Plan
| Group | Tasks | Why Safe In Parallel |
|-------|-------|----------------------|
| A | Task 1a (8A+8D tests) | test file only; disjoint from claim.js writes |
| B | Task 2a (8B test) | test file only; disjoint from claim.js writes |
| C | Task 3a (8C test) | test file only; disjoint from claim.js writes |
| D | Task 4a (8E test) | test file only; disjoint from claim.js writes |
| serial | Tasks 1c, 2b, 3b (claim.js fixes) | same file; must serialize; bottom-up order |
| serial | Task 4c (M1 conditional fix) | claim.js; must follow all other claim.js edits |

### External Dependencies
None. All fixes use Node.js ≥12 stdlib only:
- `fs.openSync(path, flags, mode)` — stdlib
- `fs.writeFileSync(path, data, { mode })` — stdlib
- `process.stderr.write(str)` — stdlib
- `isSafeName` function already in claim.js
- `/^\d+$/` pattern already in claim.js

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
- **Parallel Group:** A (test authoring phase only)
- **Action:** MODIFY

**Test 8A (file permissions):**
- Create `epic8Tmp`. Run `runClaim(epic8Tmp, sessionId, 3, 'epic8-proj')`.
- Wrap in `if (process.platform !== 'win32')`.
- Assert `(fs.statSync(lockPath).mode & 0o777) === 0o600` — `'8A: lock file mode must be 0o600'`
- Assert `(fs.statSync(sessionPath).mode & 0o777) === 0o600` — `'8A: session file mode must be 0o600'`
- Expect RED before fix (modes are 0o644).

**Test 8D (cmdStatus unsafe session_id skip):**
- Create `epic8dTmp`. Create `kaola-workflow/.locks/epic8d.lock` with JSON: `{ project: 'epic8d', session_id: '../../../etc/passwd', expires: <future ISO>, last_heartbeat: <now ISO>, claimed_at: <now ISO> }`.
- Run `spawnSync(process.execPath, [claimScript, 'status', '--json'], { cwd: epic8dTmp, encoding: 'utf8', env: { ...process.env, HOME: epic8dTmp, KAOLA_WORKFLOW_OFFLINE: '1' } })`.
- Assert `r.status === 0`.
- Assert the entry is absent from normal results OR its drift array includes `'session_id unsafe'`.
- Expect RED before fix (no guard; `readSessionFile` called with unsafe path).

**claim.js fixes — bottom-up order within file:**

Fix INFO (line 330 — inside `cmdStatus` `.map()` callback):
- NOTE: Loop uses `.map()` — `continue` is a syntax error. Use early `return` with stub entry.
- old_string: `const session = readSessionFile(root, lock.session_id);`
- new_string:
  ```
  if (!isSafeName(lock.session_id)) {
        return { session: null, lock, remote: { assignee: null, has_label: null, sentinel_comment_id: null }, consistent: false, drift: ['session_id unsafe'] };
      }
      const session = readSessionFile(root, lock.session_id);
  ```

Fix S-L1c (line 231):
- old_string: `fs.writeFileSync(lp, JSON.stringify(finalLock, null, 2) + '\n');`
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
- **Parallel Group:** B (test authoring phase only)
- **Action:** MODIFY

**Test 8B (stderr warning for missing ## Lease):**
- Create `epic8bTmp`. Create `kaola-workflow/.locks/epic8b.lock` with a valid lock JSON (project: 'epic8b', session_id: 'sess-8b', expires: future ISO, last_heartbeat: now ISO, claimed_at: now ISO).
- Create `kaola-workflow/epic8b/workflow-state.md` with `## Project` and `## Current Position` sections but deliberately NO `## Lease` section.
- Use `spawnSync` to run heartbeat: `spawnSync(process.execPath, [claimScript, 'heartbeat', '--session', 'sess-8b'], { cwd: epic8bTmp, encoding: 'utf8', env: { ...process.env, HOME: epic8bTmp, KAOLA_WORKFLOW_OFFLINE: '1' } })`.
- Assert `r.status === 0` — `'8B: heartbeat exits 0 even when Lease missing'` (advisor-required)
- Assert `r.stderr.includes('updateLeaseInPlace: ## Lease section missing in')` — `'8B: heartbeat warns when Lease section missing'`
- Expect RED before fix (no stderr warning today).

**claim.js fix M2:**
- old_string: `if (!/^## Lease\s*$/m.test(content)) return;`
- new_string: `if (!/^## Lease\s*$/m.test(content)) { process.stderr.write('updateLeaseInPlace: ## Lease section missing in ' + stateFile + '\n'); return; }`
- Context: inside `updateLeaseInPlace` (line 143).

- **Mirror:** `process.stderr.write('release: no lock found for session ' + sessionId + ... + '\n')` at line 243.
- **Validate:** `node scripts/simulate-workflow-walkthrough.js`

---

### Task 3 — Test 8C (regression), then S-L2 fix
- **File:** `scripts/kaola-workflow-claim.js`
- **Test File:** `scripts/simulate-workflow-walkthrough.js`
- **Write Set:** `claim.js` anchor `'claim_comment_id: ' + (lockData.claim_comment_id || 'N/A')`; `simulate-workflow-walkthrough.js` (8C block)
- **Depends On:** Task 0
- **Parallel Group:** C (test authoring phase only)
- **Action:** MODIFY

**Test 8C (claim_comment_id renders as N/A in offline mode — regression guard):**
- CAVEAT: In OFFLINE mode claim_comment_id is null; `null || 'N/A'` already produces 'N/A'. After the fix, `/^\d+$/.test(null)` → false → 'N/A'. Test passes both before and after fix. It exists to prevent future regression.
- Create `epic8cTmp`. Run `runClaim(epic8cTmp, sessId, 3, 'epic8c')`. Read the written workflow-state.md. Find line matching `/^claim_comment_id:\s*(.+)$/m`. Assert captured group is `'N/A'`.

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
- **Parallel Group:** D (test authoring phase only)
- **Action:** MODIFY

**Test 8E (re-claim Sink refresh — realistic state file structure):**
1. Create `epic8eTmp`. Write `kaola-workflow/epic8e/workflow-state.md` with standard sections (Project, Current Position, Pending Gates, Ownership Rules, Last Evidence, Last Updated) but NO Sink/Lease.
2. Run `runClaim(epic8eTmp, 'sess-8e-a', 3, 'epic8e')` → triggers "Sink doesn't exist" branch → appends `## Sink` + `## Lease` at end.
3. Run `spawnSync(process.execPath, [claimScript, 'release', '--session', 'sess-8e-a'], { cwd: epic8eTmp, encoding: 'utf8', env: { ...process.env, HOME: epic8eTmp, KAOLA_WORKFLOW_OFFLINE: '1' } })` to release.
4. Run `runClaim(epic8eTmp, 'sess-8e-b', 4, 'epic8e')` → triggers re-claim regex path (Sink already exists).
5. Read workflow-state.md. Assert:
   - `content.includes('issue_number: 4')` — `'8E: issue_number must be refreshed to 4'`
   - `content.match(/^claimed_at:\s*.+$/m)` truthy — `'8E: claimed_at must be present'`
   - `content.includes('## Project')` — `'8E: sibling sections must be preserved'`
   - `(content.match(/^## Sink\s*$/mg) || []).length === 1` — `'8E: exactly one ## Sink'`
   - `(content.match(/^## Lease\s*$/mg) || []).length === 1` — `'8E: exactly one ## Lease'`

**Probe result:**
- If GREEN: M1 already fixed. No claim.js change. Task 4 complete.
- If RED: Apply surgical regex fix inside `updateSinkLease` (lines 132–136). Diagnose from RED output first, then apply minimum change. Re-run to verify GREEN without breaking Epic Cases 1–7 and 8A–8D.

- **Mirror:** Epic Case 7 release sequence pattern
- **Validate:** `node scripts/simulate-workflow-walkthrough.js`

---

## Advisor Notes

The advisor reviewed the blueprint and approved it with one required addition:

**Required:** Test 8B must assert `r.status === 0` in addition to the stderr assertion. The heartbeat warning code path uses `return` (not `throw`), so exit code stays 0. The assertion catches a future regression where the warning is "upgraded" to an error. This assertion is included above.

**Non-blocking:**
- 8E' (Sink-without-Lease) stays optional. `updateSinkLease` always writes Sink+Lease atomically; the `$` alternative in the regex is unreachable under current write contract.
- 8C regression-only is acceptable. No natural injection point for non-digit `claim_comment_id` in offline mode.
- Bottom-up edit order is not load-bearing for anchor-based edits.

**File size constraint:** `simulate-workflow-walkthrough.js` must stay under 1150 lines (currently 1061 lines) after all additions.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | | advisor required one addition (8B exit-code assertion) which is incorporated above; no full re-revision needed |
