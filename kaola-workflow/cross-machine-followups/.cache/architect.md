# Code Architect: cross-machine-followups (issue #12)

## Design Decisions

- T1 before T2 before T3: all three tasks write to `scripts/simulate-workflow-walkthrough.js`. The file has no test isolation — it is sequential top-to-bottom with shared line numbers and a single Epic 9 block. Concurrent edits would collide on indices and structural context. Parallelization is impossible without restructuring the test file, which is out of scope.
- No new files: every fix is a targeted in-place edit. The hand-rolled assert harness in simulate-workflow-walkthrough.js is extended with new inline blocks — no test framework is introduced.
- No external dependencies: all mechanisms (async `spawn`, `process.kill`, `fs`, setTimeout-polling) are Node built-ins already imported.
- LOW-2 requires two independent sub-tests (SIGINT, SIGHUP), each with a fresh ticker process. One ticker cannot receive both signals — the first kills it.
- MEDIUM-2 must wrap the async ticker in try/finally that calls `child.kill('SIGKILL')` on any failure path to prevent orphan ticker processes.
- The LOW-3 canonical shim line is pinned verbatim and must not be paraphrased anywhere.

---

## Files to Create

None.

---

## Files to Modify

| File | Task | Changes | Priority |
|------|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | T1 | 7 targeted edits: L1 (lines 183–184 regex g flag), L2 (line 228 `--` separator), MEDIUM-4 (line 231 catch body), LOW-1 (line 467 dead condition), LOW-fd (line 459 return value), LOW-2 (after line 526: add SIGINT + SIGHUP handlers), I1 (line 494 Number.isFinite guard) | 1 |
| `scripts/simulate-workflow-walkthrough.js` | T1 | Add LOW-2 SIGINT/SIGHUP sub-tests (two sub-blocks inside Epic 9, after existing 9B tests) | 2 |
| `scripts/simulate-workflow-walkthrough.js` | T2 | Replace Test 9B2 block (lines 1575–1610) with async spawn-based liveness test; convert main() to async | 3 |
| `scripts/simulate-workflow-walkthrough.js` | T3 | Append corpus-grep verification block: loop all 12 shim paths, assert each contains canonical kill -0 string | 4 |
| `commands/kaola-workflow-phase1.md` | T3 | Line 31: expand if [ ! -f ... ] to include \|\| ! kill -0 ... | 5 |
| `commands/kaola-workflow-phase2.md` | T3 | Line 35: same liveness expansion | 5 |
| `commands/kaola-workflow-phase3.md` | T3 | Line 33: same | 5 |
| `commands/kaola-workflow-phase4.md` | T3 | Line 23: same | 5 |
| `commands/kaola-workflow-phase5.md` | T3 | Line 37: same | 5 |
| `commands/kaola-workflow-phase6.md` | T3 | Line 38: same | 5 |
| `plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md` | T3 | Line 29: same | 5 |
| `plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md` | T3 | Line 21: same | 5 |
| `plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md` | T3 | Line 21: same | 5 |
| `plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md` | T3 | Line 21: same | 5 |
| `plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md` | T3 | Line 21: same | 5 |
| `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` | T3 | Line 29: same | 5 |

---

## Build Sequence

### T1 — claim.js correctness fixes + LOW-2 signal regression tests

Implement in `scripts/kaola-workflow-claim.js`:

- **L1**: Add `g` flag to both `.replace()` calls in `updateLeaseInPlace` (lines 183–184). Change `/^expires:.*$/m` → `/^expires:.*$/gm` and `/^last_heartbeat:.*$/m` → `/^last_heartbeat:.*$/gm`.
- **L2**: Add `--` separator in `handleTiebreakerYield` git push (line 228). Change `['push', 'origin', branch]` → `['push', 'origin', '--', branch]`.
- **MEDIUM-4**: Replace silent `catch (_) {}` at line 231 with `catch (e) { process.stderr.write('adoption push failed: ' + e.message + '\n'); }`.
- **LOW-1**: In `runTick` at line 467, change `if (!match || match.session_id !== tickCtx.session)` → `if (!match)`.
- **LOW-fd**: In `acquirePidFile` at line 459, change `return fd;` → `return true;`.
- **LOW-2**: After the SIGTERM handler block (line 526), add:
  ```js
  process.on('SIGINT', function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); });
  process.on('SIGHUP', function() { try { fs.unlinkSync(pidPath); } catch (_) {} process.exit(0); });
  ```
- **I1**: At line 494, change `match.issue_number` truthy check → `Number.isFinite(match.issue_number)`.

Add to `scripts/simulate-workflow-walkthrough.js` (two sub-blocks inside Epic 9, after 9B tests):

- **T1-SIGINT sub-test**: Use async `spawn` (not spawnSync — you cannot send signals while blocked). Poll PID file 100ms × 30 until ticker writes live PID. Read live PID. Send `SIGINT` to child PID via `process.kill(childPid, 'SIGINT')`. Wait for child exit (via `child.on('exit')`). Assert PID file removed. Wrap in try/finally with `child.kill('SIGKILL')` on failure.
- **T1-SIGHUP sub-test**: Identical shape, independent fresh ticker subprocess, send `SIGHUP`.

Note: T1's signal sub-tests ALSO require async `spawn` (not spawnSync). Signal delivery requires the child to be running in the background while the parent sends the signal. T1 must therefore also initiate the async main() conversion, OR its sub-tests must be isolated async IIFEs that do not require main() to be async first.

**Recommended ordering adjustment**: Convert main() to async as part of T1 (or at the start of T2 if T1 sub-tests use isolated async IIFEs). Either way, the async conversion must happen before T2's MEDIUM-2 await block.

Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### T2 — MEDIUM-2 ticker-reap liveness test rewrite

Replace Test 9B2 block (lines 1575–1610) in `scripts/simulate-workflow-walkthrough.js`:

1. Setup: same directory scaffolding (subTmp, binDir, makeKwDirs, ghShim returning exit 0, writeLock with null issue/comment, write `99999999\n` to pidFile9b2).
2. Spawn ticker via `spawn` (async). Store reference as `child9b2`.
3. Wrap in try/finally: finally always runs `child9b2.kill('SIGKILL')` (ignore ESRCH).
4. Poll loop: up to 30 iterations × 100ms sleep. Read PID file on each iteration. Exit when content ≠ '99999999' OR PID file gone. If 30 iterations exhausted, throw `'9B2: PID file still contains 99999999 after 3s'`.
5. Read new PID from pidFile9b2. Assert `Number.isInteger(newPid9b2) && newPid9b2 > 0`.
6. Assert `process.kill(newPid9b2, 0)` does not throw (liveness check).
7. Send SIGTERM: `process.kill(newPid9b2, 'SIGTERM')`.
8. Await child exit with 3s safety timeout.
9. Assert exit code 0 (SIGTERM handler calls process.exit(0)).
10. Assert pidFile9b2 does not exist.

Async main() conversion (if not done in T1):
- Change `function main()` → `async function main()`
- Change call site: `main().catch(e => { console.error(e); process.exitCode = 1; })`
- All existing spawnSync blocks remain unchanged.

Validate: `node scripts/simulate-workflow-walkthrough.js`

---

### T3 — LOW-3 shim liveness upgrade + corpus-grep verification

Edit 12 shim files (identical pattern in each):

Replace:
```bash
if [ ! -f "$_TICKER_PID_FILE" ]; then
```
With (verbatim — do not paraphrase):
```bash
if [ ! -f "$_TICKER_PID_FILE" ] || ! kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null; then
```

Files:
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

Append to `scripts/simulate-workflow-walkthrough.js` (synchronous block after T2):

```js
// LOW-3 corpus-grep verification
const shimFiles = [
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
for (const shimPath of shimFiles) {
  const content = fs.readFileSync(shimPath, 'utf8');
  assert(content.includes(LIVENESS_CANONICAL), 'LOW-3: missing liveness check in ' + shimPath);
}
```

Validate: `node scripts/simulate-workflow-walkthrough.js`

---

## Parallelization Plan

All tasks are SERIAL. No parallel groups.

| Group | Tasks | Reason |
|-------|-------|--------|
| serial | T1→T2→T3 | All three write to simulate-workflow-walkthrough.js; T2 requires async main() which must be in place before T2's await; T3 corpus-grep requires T3 shim edits complete |

---

## Write Sets Per Task

| Task | Files Written |
|------|--------------|
| T1 | `scripts/kaola-workflow-claim.js`, `scripts/simulate-workflow-walkthrough.js` |
| T2 | `scripts/simulate-workflow-walkthrough.js` |
| T3 | `scripts/simulate-workflow-walkthrough.js`, 12 shim markdown files |

---

## External Dependencies

None. All Node.js built-ins:
- `child_process.spawn` — extend destructure at top of claim.js (already has spawnSync)
- `fs` — already required
- `process.kill` — global
- `setTimeout` — global (polling sleep helper)
- `path` — already required in simulate-workflow-walkthrough.js
