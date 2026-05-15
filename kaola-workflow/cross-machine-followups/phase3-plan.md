# Phase 3 - Plan: cross-machine-followups

## Blueprint

### Files to Create
None.

### Files to Modify

| File | Task | Changes |
|------|------|---------|
| `scripts/kaola-workflow-claim.js` | T1 | 7 edits: L1 (183–184 g flag), L2 (228 -- separator), MEDIUM-4 (231 catch body), LOW-1 (467 dead condition), LOW-fd (459 return true), LOW-2 (after 526: SIGINT+SIGHUP handlers), I1 (494 Number.isFinite) |
| `scripts/simulate-workflow-walkthrough.js` | T1 | Async main() conversion (lines 121, 1731) + LOW-2 SIGINT/SIGHUP sub-tests + sleep/waitExit helpers |
| `scripts/simulate-workflow-walkthrough.js` | T2 | Replace 9B2 block (lines 1575–1610) with async spawn + poll + liveness assertion |
| `scripts/simulate-workflow-walkthrough.js` | T3 | Append corpus-grep verification block (synchronous, inside async main()) |
| `commands/kaola-workflow-phase1.md` | T3 | Line 31: add liveness check |
| `commands/kaola-workflow-phase2.md` | T3 | Line 35: add liveness check |
| `commands/kaola-workflow-phase3.md` | T3 | Line 33: add liveness check |
| `commands/kaola-workflow-phase4.md` | T3 | Line 23: add liveness check |
| `commands/kaola-workflow-phase5.md` | T3 | Line 37: add liveness check |
| `commands/kaola-workflow-phase6.md` | T3 | Line 38: add liveness check |
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | T3 | Line 29: add liveness check |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | T3 | Line 21: add liveness check |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | T3 | Line 21: add liveness check |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | T3 | Line 21: add liveness check |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | T3 | Line 21: add liveness check |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | T3 | Line 29: add liveness check |

### Build Sequence
1. T1 — claim.js mechanical fixes + async main() conversion + LOW-2 signal tests (no prior dependencies)
2. T2 — MEDIUM-2 liveness test rewrite (depends on T1: requires async main() already in place)
3. T3 — LOW-3 shim batch + corpus-grep verification (depends on T2: appends inside async main() after MEDIUM-2 block)

### Parallelization Plan

| Group | Tasks | Why Serial |
|-------|-------|------------|
| serial | T1→T2→T3 | All three write simulate-workflow-walkthrough.js; T2 requires async main() from T1; T3 corpus-grep appends after T2's MEDIUM-2 block; no parallel groups possible |

### External Dependencies
None. All Node.js built-ins (spawn, fs, process.kill, setTimeout, path). No new npm packages.

---

## Task List

### Task 1: claim.js mechanical fixes + async main() conversion + LOW-2 signal tests

- File: `scripts/kaola-workflow-claim.js`
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/kaola-workflow-claim.js`, `scripts/simulate-workflow-walkthrough.js`
- Depends On: none
- Parallel Group: serial
- Action: MODIFY

#### Implement in `scripts/kaola-workflow-claim.js`

**L1 — updateLeaseInPlace regex g flag (lines 183–184):**
```js
// BEFORE:
.replace(/^expires:.*$/m, 'expires: ' + lockData.expires)
.replace(/^last_heartbeat:.*$/m, 'last_heartbeat: ' + lockData.last_heartbeat)
// AFTER:
.replace(/^expires:.*$/gm, 'expires: ' + lockData.expires)
.replace(/^last_heartbeat:.*$/gm, 'last_heartbeat: ' + lockData.last_heartbeat)
```

**L2 — git push `--` separator (line 228):**
```js
// BEFORE:
execFileSync('git', ['push', 'origin', branch], { encoding: 'utf8' });
// AFTER:
execFileSync('git', ['push', 'origin', '--', branch], { encoding: 'utf8' });
```

**MEDIUM-4 — log adoption push failure to stderr (line 231):**
```js
// BEFORE:
} catch (_) {}
// AFTER:
} catch (e) { process.stderr.write('adoption push failed: ' + e.message + '\n'); }
```

**LOW-1 — remove dead tautology in runTick (line 467):**
```js
// BEFORE:
if (!match || match.session_id !== tickCtx.session) {
// AFTER:
if (!match) {
```
Rationale: `locks.find(l => l.session_id === tickCtx.session)` already guarantees match.session_id === tickCtx.session when match is truthy.

**LOW-fd — acquirePidFile return boolean (line 459):**
```js
// BEFORE:
return fd;
// AFTER:
return true;
```
Caller at line 522 uses `=== null` sentinel; non-null truthy value is correct.

**LOW-2 — SIGINT and SIGHUP handlers (after SIGTERM handler at line 523–526):**
```js
process.on('SIGINT', function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); });
process.on('SIGHUP', function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); });
```
Mirror the existing SIGTERM handler exactly.

**I1 — Number.isFinite guard for issue_number (line 494):**
```js
// BEFORE:
if (tickCount === 1 && match.claim_comment_id && match.issue_number) {
// AFTER:
if (tickCount === 1 && match.claim_comment_id && Number.isFinite(match.issue_number)) {
```

#### Implement in `scripts/simulate-workflow-walkthrough.js`

**Async main() conversion (T1 owns this):**
- Line 121: `function main()` → `async function main()`
- Line 1731: `main()` → `main().catch(e => { console.error(e); process.exitCode = 1; })`

**Add helper functions near top of file (or inside main(), before Epic 9):**
```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitExit = (child, timeoutMs) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('exit timeout')), timeoutMs);
  child.on('exit', (code, signal) => { clearTimeout(t); resolve({ code, signal }); });
});
```

**Ensure `spawn` is destructured at top of file (currently only spawnSync is imported):**
```js
// BEFORE:
const { execFileSync, spawnSync } = require('child_process');
// AFTER:
const { execFileSync, spawn, spawnSync } = require('child_process');
```

**LOW-2 SIGINT sub-test (append inside Epic 9 after existing 9B tests):**
```js
// Sub-test: SIGINT cleans up PID file
await (async function test9B_SIGINT() {
  const subTmpSigint = fs.mkdtempSync(path.join(tmp, 'sigint-'));
  const pidFileSigint = path.join(root, 'kaola-workflow', '.tickers', 'sess-sigint.pid');
  // setup: writeLock, makeKwDirs, ghShim (no issue/comment so tick() exits early)
  // ... [setup mirroring existing 9B pattern]
  const child = spawn(process.execPath, [claimScript9, 'ticker', '--session', 'sess-sigint', '--interval', '999999999'], { cwd: root });
  try {
    // poll until PID file has live PID (100ms × 30)
    let childPid = null;
    for (let i = 0; i < 30; i++) {
      await sleep(100);
      if (fs.existsSync(pidFileSigint)) {
        const raw = fs.readFileSync(pidFileSigint, 'utf8').trim();
        const p = parseInt(raw, 10);
        if (Number.isFinite(p) && p > 0) { childPid = p; break; }
      }
    }
    assert(childPid !== null, 'SIGINT test: ticker did not write live PID within 3s');
    process.kill(childPid, 'SIGINT');
    const { code } = await waitExit(child, 3000);
    assert(code === 0, 'SIGINT test: ticker exited with code ' + code + ', expected 0');
    assert(!fs.existsSync(pidFileSigint), 'SIGINT test: PID file not removed after SIGINT');
  } finally {
    try { child.kill('SIGKILL'); } catch (_) {}
    fs.rmSync(subTmpSigint, { recursive: true, force: true });
  }
})();
```

**LOW-2 SIGHUP sub-test (append after SIGINT sub-test, same shape):**
Same structure as SIGINT sub-test, with:
- Session name: `sess-sighup`
- pidFileSighup variable
- Signal: `'SIGHUP'`
- Assertion messages prefixed `SIGHUP test:`

Mirror: Phase 1 pattern: "existing `process.on('SIGTERM', function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); })` — mirror for SIGINT and SIGHUP."

- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task 2: MEDIUM-2 liveness test rewrite

- File: `scripts/simulate-workflow-walkthrough.js`
- Test File: `scripts/simulate-workflow-walkthrough.js` (self-contained)
- Write Set: `scripts/simulate-workflow-walkthrough.js`
- Depends On: Task 1 (async main() must be in place; sleep/waitExit helpers must exist)
- Parallel Group: serial
- Action: MODIFY

#### Implement in `scripts/simulate-workflow-walkthrough.js`

Replace Test 9B2 block (lines 1575–1610) with async liveness test:

**Setup** (keep existing scaffolding — subTmp9b2, binDir9b2, makeKwDirs, ghShim exit 0, writeLock sess-9b2 with null issue/comment):
```js
// Write stale PID sentinel
fs.writeFileSync(pidFile9b2, '99999999\n', { encoding: 'utf8' });
```

**Spawn ticker asynchronously:**
```js
const child9b2 = spawn(process.execPath, [claimScript9, 'ticker', '--session', 'sess-9b2', '--interval', '999999999'], { cwd: root9b2 });
```

**Wrap in try/finally (prevents orphan ticker on any failure path):**
```js
try {
  // poll until PID file changes from '99999999' (100ms × 30 = 3s)
  let newPid9b2 = null;
  for (let i = 0; i < 30; i++) {
    await sleep(100);
    if (!fs.existsSync(pidFile9b2)) break;
    const raw = fs.readFileSync(pidFile9b2, 'utf8').trim();
    if (raw !== '99999999') {
      const p = parseInt(raw, 10);
      if (Number.isFinite(p) && p > 0) { newPid9b2 = p; break; }
    }
  }
  assert(newPid9b2 !== null, '9B2: stale PID file must be reaped and replaced with live PID within 3s');

  // liveness assertion
  try {
    process.kill(newPid9b2, 0);
  } catch (e) {
    assert(false, '9B2: ticker process ' + newPid9b2 + ' is not alive after PID reap: ' + e.message);
  }

  // send SIGTERM; ticker SIGTERM handler calls process.exit(0)
  process.kill(newPid9b2, 'SIGTERM');
  const result9b2 = await waitExit(child9b2, 3000);
  assert(result9b2.code === 0, '9B2: ticker did not exit cleanly after SIGTERM, code=' + result9b2.code);
  assert(!fs.existsSync(pidFile9b2), '9B2: PID file not removed after SIGTERM');
} finally {
  try { child9b2.kill('SIGKILL'); } catch (_) {}
}
```

Mirror: Phase 1 pattern: "after reading new PID from pidFile9b2, add `assert(canKill(newPid), '9B2: ticker must still be running')` — use `process.kill(newPid, 0)` wrapped in try/catch."

- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### Task 3: LOW-3 shim liveness upgrade + corpus-grep verification

- File: 12 shim markdown files
- Test File: `scripts/simulate-workflow-walkthrough.js`
- Write Set: `scripts/simulate-workflow-walkthrough.js`, all 12 shim markdown files
- Depends On: Task 2 (corpus-grep block appends after MEDIUM-2 block inside async main())
- Parallel Group: serial
- Action: MODIFY

#### LOW-3 canonical form (PINNED VERBATIM — do not paraphrase)

```
kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null
```

#### Edit 12 shim files (identical pattern)

In each file, replace:
```bash
if [ ! -f "$_TICKER_PID_FILE" ]; then
```
With:
```bash
if [ ! -f "$_TICKER_PID_FILE" ] || ! kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null; then
```

Files and lines:

| File | Line |
|------|------|
| `commands/kaola-workflow-phase1.md` | 31 |
| `commands/kaola-workflow-phase2.md` | 35 |
| `commands/kaola-workflow-phase3.md` | 33 |
| `commands/kaola-workflow-phase4.md` | 23 |
| `commands/kaola-workflow-phase5.md` | 37 |
| `commands/kaola-workflow-phase6.md` | 38 |
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | 29 |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | 21 |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | 21 |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | 21 |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | 21 |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | 29 |

#### Append corpus-grep verification block to `scripts/simulate-workflow-walkthrough.js`

Place this synchronous block inside async main(), after the awaited MEDIUM-2 block, before main()'s cleanup finally:

```js
// LOW-3 corpus-grep verification (synchronous — runs inside async main())
const shimPaths = [
  path.join(__dirname, '..', 'commands', 'kaola-workflow-phase1.md'),
  path.join(__dirname, '..', 'commands', 'kaola-workflow-phase2.md'),
  path.join(__dirname, '..', 'commands', 'kaola-workflow-phase3.md'),
  path.join(__dirname, '..', 'commands', 'kaola-workflow-phase4.md'),
  path.join(__dirname, '..', 'commands', 'kaola-workflow-phase5.md'),
  path.join(__dirname, '..', 'commands', 'kaola-workflow-phase6.md'),
  path.join(__dirname, '..', 'plugins', 'kaola-workflow', 'skills', 'kaola-workflow-research', 'SKILL.md'),
  path.join(__dirname, '..', 'plugins', 'kaola-workflow', 'skills', 'kaola-workflow-execute', 'SKILL.md'),
  path.join(__dirname, '..', 'plugins', 'kaola-workflow', 'skills', 'kaola-workflow-ideation', 'SKILL.md'),
  path.join(__dirname, '..', 'plugins', 'kaola-workflow', 'skills', 'kaola-workflow-plan', 'SKILL.md'),
  path.join(__dirname, '..', 'plugins', 'kaola-workflow', 'skills', 'kaola-workflow-review', 'SKILL.md'),
  path.join(__dirname, '..', 'plugins', 'kaola-workflow', 'skills', 'kaola-workflow-finalize', 'SKILL.md'),
];
const LIVENESS_CANONICAL = 'kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null';
for (const shimPath of shimPaths) {
  const shimContent = fs.readFileSync(shimPath, 'utf8');
  assert(shimContent.includes(LIVENESS_CANONICAL), 'LOW-3: missing liveness check in ' + shimPath);
}
```

Mirror: Phase 1 pattern: "Grep-invariance (recommended over bash snippet extraction). Add test block that iterates 12 file paths, asserts each contains the new `kill -0` clause."

Note: `__dirname` in simulate-workflow-walkthrough.js resolves to `scripts/`; `..` from there reaches repo root.

- Validate: `node scripts/simulate-workflow-walkthrough.js`

---

## Advisor Notes

- Blueprint is sound. One ambiguity resolved: **T1 owns async main() conversion** (not T2), because T1's LOW-2 signal sub-tests also need async spawn — spawnSync cannot deliver signals to a blocked child.
- main() structure confirmed: `function main()` at line 121, `main()` call at line 1731.
- Three helper primitives pinned verbatim (sleep, waitExit, PID parse) — tdd-guide must use these exact forms.
- LOW-2 sub-tests: each signal (SIGINT, SIGHUP) gets its own try/finally + child.kill('SIGKILL') on failure. One ticker per sub-test.
- Corpus-grep block: inside async main(), after MEDIUM-2 await, before cleanup finally.

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | invoked | .cache/architect.md | |
| advisor plan gate | invoked | .cache/advisor-plan.md | |
| architect revisions | N/A | Advisor gaps resolved by main-session synthesis with pinned primitives; no blueprint gaps requiring re-architect | |
