# Advisor — Plan Gate: cross-machine-followups

## Verdict
Blueprint is sound on substance (file:line targets, canonical form pinning, try/finally, polling budget). One ambiguity blocks Phase 4.

## Blocks Phase 4 (pinned in phase3-plan.md)

**Async main() ownership resolved as T1.** T1 already needs async spawn for LOW-2 signal sub-tests (spawnSync cannot deliver signals to a blocked child). T1 converting main() to async lets T2 be a pure 9B2 replacement inside an already-async harness.

**Confirmed main() structure** (verified via grep):
- `function main()` at line 121 of simulate-workflow-walkthrough.js
- `main()` call at line 1731
- Async conversion: line 121 → `async function main()`; line 1731 → `main().catch(e => { console.error(e); process.exitCode = 1; })`

## Phase 4 Implementation Discipline (pinned in task notes)

**Three helper primitives pinned verbatim:**
- `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));`
- `const waitExit = (child, timeoutMs) => new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('exit timeout')), timeoutMs); child.on('exit', (code, signal) => { clearTimeout(t); resolve({ code, signal }); }); });`
- PID parse: `parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10)` with `Number.isFinite && pid > 0` assertion.

**Corpus-grep block placement (T3)**: inside async main(), after the awaited MEDIUM-2 block, before main()'s cleanup finally. Synchronous code inside an async function — correct placement ensures it runs inside the cleanup guard.

**LOW-2 sub-test structure**: each sub-test (SIGINT, SIGHUP) gets its own try/finally with `child.kill('SIGKILL')` on failure. One ticker per signal — do not reuse same child between tests.

## Non-Blocking Notes
LOW-3 canonical form pinning is correctly verbatim. 100ms × 30 polling budget matches Phase 2 advisor guidance. try/finally cleanup explicitly required. All 12 shim line numbers match Phase 1 evidence.

## User Decision Required
None.
