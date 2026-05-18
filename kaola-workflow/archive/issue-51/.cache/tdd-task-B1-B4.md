# TDD Evidence: Tasks B1–B4

Generated: 2026-05-18

## Summary

Tasks B1 (helpers + ticker Codex-safe gate + 9A3 env-gate), B2 (Codex simulation path fix + sync-validator comment), B3 (Epic 20A RED), and B4 (closed-issue cleanup → Epic 20A GREEN) completed as a single TDD cycle.

---

## Files Modified

| File | Changes |
|------|---------|
| `scripts/kaola-workflow-claim.js` | H1 helper, H2 ticker gate, runTick comment, sweep closed-fastPath gate, cmdWorktreeFinalize remoteCleanup flip, claimExplicitTarget closed guard |
| `scripts/simulate-workflow-walkthrough.js` | 9A3 env-gate, Epic 20A insertion, test 7D gh-shim extension |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | B2 path fix (line 113), repoRoot constant |
| `scripts/validate-script-sync.js` | B2 comment update (line 24) |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Synced from scripts/kaola-workflow-claim.js |

---

## B1 — H1 helper + H2 ticker Codex-safe gate + 9A3 env-gate

### H1: `isIssueClosed` helper

**Location**: `scripts/kaola-workflow-claim.js` — inserted after line 2106 (closing brace of `isRemoteStale`), before `function cmdSweep`.

**Before**: no `isIssueClosed` function existed.

**After** (lines ~2107–2118):
```js
function isIssueClosed(issueNumber) {
  if (OFFLINE || issueNumber == null) return false;
  try {
    const raw = ghExec(['issue', 'view', String(issueNumber), '--json', 'state']);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return String(data.state || '').toLowerCase() === 'closed';
  } catch (_) { return false; }
}
```
Fail-open: returns false on OFFLINE / parse / gh error.

### H2: Ticker Codex-safe gate

**Location**: `scripts/kaola-workflow-claim.js:2087–2095` (was `:2087–2094`)

**Before**:
```js
tickCtx.claudePid = walkToClaudePid();  // null if not under Claude
if (tickCtx.claudePid === null) {
  process.stderr.write('ticker: no Claude ancestor at startup; orphaned, exiting\n');
  try { fs.unlinkSync(pidPath); } catch (_) {}
  return;
}
runTick(tickCtx);
```

**After** (OR-of-three gate):
```js
tickCtx.claudePid = walkToClaudePid();  // null if not under Claude
const codexLike = args.runtime === 'codex'
  || !!process.env.CODEX_THREAD_ID
  || process.env.KAOLA_KERNEL_SESSION_SKIP === '1';
if (tickCtx.claudePid === null && !codexLike) {
  process.stderr.write('ticker: no Claude ancestor at startup; orphaned, exiting\n');
  try { fs.unlinkSync(pidPath); } catch (_) {}
  return;
}
runTick(tickCtx);
```

### runTick clarifying comment

**Location**: `scripts/kaola-workflow-claim.js:2055` (above `releaseSession(... 'ticker-late-yield', { remoteCleanup: false })`)

**Added**:
```js
// remoteCleanup:false intentional — tiebreaker-yield must not clear the winning session's label/assignee
```

### 9A3 env-gate

**Location**: `scripts/simulate-workflow-walkthrough.js:2398` (ticker spawn env)

**Before**:
```js
env: { ...process.env, PATH: binDir + path.delimiter + PATH, HOME: subTmp }
```

**After**:
```js
env: { ...process.env, PATH: binDir + path.delimiter + PATH, HOME: subTmp, KAOLA_KERNEL_SESSION_SKIP: '1' }
```

**Note**: The suite already passed 9A3 before H2 because the test inherits the parent process's Claude ancestor chain. The H2 + 9A3 env-gate ensures Codex environments (where `walkToClaudePid()` returns null) also pass.

---

## B2 — Codex simulation path fix + sync-validator comment

### Plugin simulation path fix

**Location**: `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`

**Before** (line 7 and line 113):
```js
const root = path.resolve(__dirname, '..');
// ...
const output = execFileSync(process.execPath, [path.join(root, 'scripts/kaola-workflow-compact-context.js')], {
```
`root` = `plugins/kaola-workflow/` → path resolves to `plugins/kaola-workflow/scripts/kaola-workflow-compact-context.js` (does not exist).

**After** (lines 7–8 and line 114):
```js
const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '..', '..', '..');
// ...
const output = execFileSync(process.execPath, [path.join(repoRoot, 'scripts/kaola-workflow-compact-context.js')], {
```
`repoRoot` = three levels up from `plugins/kaola-workflow/scripts/` → reaches the repo root.

**RED evidence** (before fix):
```
Error: Cannot find module '/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow/plugins/kaola-workflow/scripts/kaola-workflow-compact-context.js'
```
Confirmed via `git stash` + run test.

**B2 advancement**: After fix, plugin sim advances past line 113 (compact-context path) and hits line 370 (pre-existing structural failure: `plugins/kaola-workflow/commands/` directory absent). The line 370 failure is pre-existing and outside the B1-B4 write set — see Gate 2 status below.

### validate-script-sync.js comment

**Location**: `scripts/validate-script-sync.js:24-26`

**Before**:
```
//   kaola-workflow-compact-context.js, kaola-workflow-session-env.js (Claude-only) —
//     these implement Claude Code SessionStart hooks that have no Codex equivalent.
```

**After**:
```
//   kaola-workflow-compact-context.js, kaola-workflow-session-env.js (Claude-only) —
//     these implement Claude Code SessionStart hooks that have no Codex equivalent.
//     The Codex simulation invokes kaola-workflow-compact-context.js via a repo-root
//     absolute path (see `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`),
//     so no plugin-local copy is needed.
```

---

## B3 — Epic 20A RED state

**Location**: `scripts/simulate-workflow-walkthrough.js` — inserted before `console.log('Workflow walkthrough simulation passed')` (line 6078).

**Design**: Non-synthetic UUID-style session `'12345678-aaaa-bbbb-cccc-202a00000001'` forces `isSyntheticTestSession()` to return false, making sweep take the production path through `shouldSweep` + `isRemoteStale`. Lock is freshly created (< 24h), so `shouldSweep` returns false, `isRemoteStale` returns false → sweep does nothing → assert fails.

**RED evidence** (captured before B4):
```
Error: Epic 20A: sweep must remove lock for closed issue 46 (non-synthetic session, fresh lock)
    at assert (.../scripts/simulate-workflow-walkthrough.js:29:11)
```

---

## B4 — Implement closed-issue cleanup (Epic 20A → GREEN)

### B4(a): cmdSweep closed-issue fast-path

**Location**: `scripts/kaola-workflow-claim.js` — sweep loop (was lines 2125–2137, now adjusted)

**Before**:
```js
const synthetic = isSyntheticTestSession(lock);
if (!synthetic && !shouldSweep(lock)) continue;
if (!synthetic && !isRemoteStale(lock)) continue;

if (!OFFLINE && lock.issue_number != null) {
  try {
    ghExec(['issue', 'edit', String(lock.issue_number), '--remove-label', CLAIM_LABEL]);
  } catch (_) {}
  try {
    ghExec(['issue', 'edit', String(lock.issue_number), '--remove-assignee', '@me']);
  } catch (_) {}
  postReleaseComment(lock.issue_number, lock.session_id, ':released-stale');
}
try { fs.unlinkSync(fp); } catch (_) {}
```

**After**:
```js
const synthetic = isSyntheticTestSession(lock);
const closedFastPath = !synthetic && !OFFLINE && lock.issue_number != null && isIssueClosed(lock.issue_number);
if (!synthetic && !closedFastPath && !shouldSweep(lock)) continue;
if (!synthetic && !closedFastPath && !isRemoteStale(lock)) continue;

if (!OFFLINE && lock.issue_number != null) {
  try {
    ghExec(['issue', 'edit', String(lock.issue_number), '--remove-label', CLAIM_LABEL]);
  } catch (_) {}
  try {
    ghExec(['issue', 'edit', String(lock.issue_number), '--remove-assignee', '@me']);
  } catch (_) {}
  postReleaseComment(lock.issue_number, lock.session_id, closedFastPath ? ':released-closed-issue' : ':released-stale');
}
if (closedFastPath) {
  try { removeWorktree(coordRoot, lock.project, lock); } catch (_) {}
}
try { fs.unlinkSync(fp); } catch (_) {}
```

### B4(b): cmdFinalize releaseSession insert — DEFERRED (DEVIATION)

**Status**: Reverted. Not applied.

**Reason**: Test 34-A at `scripts/simulate-workflow-walkthrough.js:4783` explicitly asserts "lock file must survive finalize (required for idempotency check)". Inserting `releaseSession` before `archiveProjectDir` calls `fs.unlinkSync(lockPath)`, removing the lock. The second-call idempotency path (line 4791) then hits `cmdFinalize`'s "no lock file" guard and exits with status 1 instead of `{already: true}`.

Reconciling requires both changing `cmdFinalize`'s missing-lock handling AND rewriting test 34-A's second-call expectations — out of scope for B4. Documented as planning gap; label-clearing on finalize is a partial gap (covered transitively when the PR closes via `cmdWatchPr` CLOSED with default `remoteCleanup:true`).

### B4(c): cmdWorktreeFinalize remoteCleanup flip

**Location**: `scripts/kaola-workflow-claim.js` — `cmdWorktreeFinalize` `if (args.session)` block (~line 2779)

**Before**:
```js
releaseSession(root, coordRoot, args.session, 'worktree-finalized', { remoteCleanup: false });
```

**After**:
```js
releaseSession(root, coordRoot, args.session, 'worktree-finalized');
```
Default `remoteCleanup: true` enables label/assignee cleanup on worktree-finalize.

### B4(d): claimExplicitTarget closed guard

**Location**: `scripts/kaola-workflow-claim.js` — `claimExplicitTarget` function, inserted BEFORE `issueAlreadyClaimed` (line 1305)

**After** (inserted at top of function body):
```js
if (!OFFLINE && isIssueClosed(targetIssue)) {
  return {
    status: 'user_target_closed',
    issue: targetIssue,
    project: 'issue-' + targetIssue,
    reasoning: 'GitHub issue #' + targetIssue + ' is closed; cannot claim a closed issue'
  };
}
```

**Deviation from phase4-progress.md:31**: phase4-progress said "insert AFTER `issueAlreadyClaimed` check". The task spec and advisor both say BEFORE. Followed task spec. Reason: a closed issue whose lock was cleared by sweep but whose claim-comment trail is gone would fall through `issueAlreadyClaimed` to `target_unavailable`, never hitting the closed check. Inserting BEFORE ensures closed issues are caught regardless of claim state.

**OFFLINE smoke test** (V3 verification):
```
KAOLA_OFFLINE=1 node scripts/kaola-workflow-claim.js startup --target-issue 51 --session test-offline-smoke
```
Output: `"verdict":"target_occupied"` — NOT `user_target_closed`. Fail-open confirmed.

### B4(e): runTick comment — see B1 section above (applied in B1 batch)

### B4(f): Test 7D gh-shim extension + label assertion

**Location**: `scripts/simulate-workflow-walkthrough.js:1436–1466`

Added `ghLog7D` file path and extended 7D gh shim to log `gh issue edit` calls via `$GH_CALL_LOG_7D` env var. Added assertion before branch-not-deleted check:
```js
const ghLog7DContent = fs.existsSync(ghLog7D) ? fs.readFileSync(ghLog7D, 'utf8') : '';
assert(ghLog7DContent.includes('--remove-label'),
  '7D: gh issue edit --remove-label must be called on CLOSED PR, calls: ' + ghLog7DContent);
```

`releaseSession` in `cmdWatchPr` CLOSED branch (line 2367) calls `gh issue edit --remove-label ... --remove-assignee @me` in a single combined call (line 1882). The shim logs this, assertion passes.

### B4(g): Sync claim.js to plugin tree — applied after each batch

---

## Commands Run

```bash
# B1+B2 baseline validation
node scripts/simulate-workflow-walkthrough.js → "Workflow walkthrough simulation passed"
node scripts/validate-script-sync.js → "OK: 7 common scripts in sync."

# B3 RED verification
node scripts/simulate-workflow-walkthrough.js 2>&1 | grep "20A"
# Output: Error: Epic 20A: sweep must remove lock for closed issue 46 (non-synthetic session, fresh lock)

# B4 GREEN verification
node scripts/simulate-workflow-walkthrough.js → "Workflow walkthrough simulation passed"
node scripts/validate-script-sync.js → "OK: 7 common scripts in sync."

# OFFLINE smoke test (advisor V3)
KAOLA_OFFLINE=1 node scripts/kaola-workflow-claim.js startup --target-issue 51 --session test-offline-smoke
# Output includes: "verdict":"target_occupied" — NOT user_target_closed (fail-open confirmed)
```

---

## Final Gate Status

| Gate | Command | Status | Notes |
|------|---------|--------|-------|
| Gate 1 | `node scripts/simulate-workflow-walkthrough.js` | **PASS** | Exits 0, "Workflow walkthrough simulation passed" |
| Gate 2 | `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | **BLOCKED** | Pre-existing failure at line 370: `plugins/kaola-workflow/commands/` directory absent. B2 fixed the `Cannot find module` error at line 113; advancement to line 370 confirms B2 correctness. Confirmed pre-existing via `git stash` + run. Fix requires creating `plugins/kaola-workflow/commands/*.md` — outside B1-B4 write set. |
| Gate 3 | `node scripts/validate-script-sync.js` | **PASS** | "OK: 7 common scripts in sync." |

---

## Deviations from Plan

| Deviation | Reason | Impact |
|-----------|--------|--------|
| B4(b) `cmdFinalize` releaseSession insert REVERTED | Conflicts with test 34-A idempotency contract at line 4783 ("lock file must survive finalize"). `releaseSession` deletes the lock, breaking the second-call `{already: true}` path. Planning miss — architect did not anticipate this contract. | Label cleanup on finalize is a partial gap. Covered transitively by `cmdWatchPr` CLOSED path for PR-backed sessions. Narrow gap for non-PR finalizes. |
| Gate 2 blocked | `plugins/kaola-workflow/commands/` directory does not exist in repo (pre-existing). Outside write set. | No B1-B4 functionality impact. Routing: scope/write-set violation → stop and report. |
| claimExplicitTarget insert site: BEFORE (not AFTER) `issueAlreadyClaimed` | Task spec says BEFORE; phase4-progress.md said AFTER. Task spec and advisor both say BEFORE. Followed task spec. | Correct behavior: closed issues caught even when no active lock exists. |
