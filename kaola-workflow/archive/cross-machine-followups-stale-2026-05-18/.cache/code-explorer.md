# Code Explorer: cross-machine-followups (issue #12)

## All items target scripts/kaola-workflow-claim.js + simulate-workflow-walkthrough.js + phase shims

---

## MEDIUM-2 — Test 9B2 weak assertion
File: scripts/simulate-workflow-walkthrough.js, lines 1575–1610

Setup (lines 1577–1591): creates subTmp, writes lock for `sess-9b2`, writes stale PID file with `99999999`.
Spawn (lines 1595–1604): spawns ticker --session sess-9b2 --interval 999999999, timeout 3000ms.
Assertion (lines 1608–1609):
```js
const pidContentAfter9b2 = fs.existsSync(pidFile9b2) ? fs.readFileSync(pidFile9b2, 'utf8').trim() : '';
assert(pidContentAfter9b2 !== '99999999', '9B2: stale PID file must be reaped ...');
```
Only checks PID content changed — does NOT check that the ticker process is still alive. If ticker crashes immediately after writing/deleting the PID file, pidContent becomes '' (satisfies assertion) even with no live process.

Fix: add `process.kill(newPid, 0)` liveness assertion after reading the new PID.

---

## MEDIUM-4 — handleTiebreakerYield silent push failure
File: scripts/kaola-workflow-claim.js, lines 219–234

```js
function handleTiebreakerYield(root, args, tbResult) {
  // ...
  try {
    const branches = execFileSync('git', ['branch', '--list', ...], { encoding: 'utf8' }).trim();
    if (branches) {
      const branch = branches.split('\n')[0].trim().replace(/^\*\s*/, '');
      execFileSync('git', ['push', 'origin', branch], { encoding: 'utf8' });   // line 228
      postReleaseComment(args.issue, args.session, ':branch pushed → ' + branch);
    }
  } catch (_) {}   // line 231: silently swallows all errors
```

Fix: `catch (e) { process.stderr.write('adoption push failed: ' + e.message + '\n'); }`

---

## LOW-1 — Dead condition in runTick
File: scripts/kaola-workflow-claim.js, lines 462–470

```js
function runTick(tickCtx) {
  const locks = readLockFiles(tickCtx.root);
  const match = locks.find(function(l) { return l.session_id === tickCtx.session; });
  if (!match || match.session_id !== tickCtx.session) {   // line 467
```

`match.session_id !== tickCtx.session` is always false when match is truthy (find already filtered by that condition). Dead tautology.

Fix: `if (!match) {` or `assert(!match || match.session_id === tickCtx.session)` + `if (!match) {`.

---

## LOW-2 — SIGINT/SIGHUP missing in cmdTicker
File: scripts/kaola-workflow-claim.js, lines 507–529

Line 523: `process.on('SIGTERM', ...)` handler exists and unlinks PID file.
No `process.on('SIGINT', ...)` and no `process.on('SIGHUP', ...)`.

Fix: add identical handlers for SIGINT and SIGHUP mirroring the SIGTERM handler.

---

## LOW-3 — Phase shims: file existence check, not liveness
12 files share the identical pattern:
```bash
_TICKER_PID_FILE="$(git rev-parse --show-toplevel)/kaola-workflow/.tickers/${KAOLA_SESSION_ID}.pid"
if [ ! -f "$_TICKER_PID_FILE" ]; then
  nohup node ... ticker --session "$KAOLA_SESSION_ID" >/dev/null 2>&1 &
  disown
fi
```

Files and lines:
| File | Line |
|------|------|
| commands/kaola-workflow-phase1.md | 31 |
| commands/kaola-workflow-phase2.md | 35 |
| commands/kaola-workflow-phase3.md | 33 |
| commands/kaola-workflow-phase4.md | 23 |
| commands/kaola-workflow-phase5.md | 37 |
| commands/kaola-workflow-phase6.md | 38 |
| plugins/kaola-workflow/skills/kaola-workflow-research/SKILL.md | 29 |
| plugins/kaola-workflow/skills/kaola-workflow-execute/SKILL.md | 21 |
| plugins/kaola-workflow/skills/kaola-workflow-ideation/SKILL.md | 21 |
| plugins/kaola-workflow/skills/kaola-workflow-plan/SKILL.md | 21 |
| plugins/kaola-workflow/skills/kaola-workflow-review/SKILL.md | 21 |
| plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md | 29 |

Fix pattern (shell):
```bash
if [ ! -f "$_TICKER_PID_FILE" ] || ! kill -0 "$(cat "$_TICKER_PID_FILE" 2>/dev/null)" 2>/dev/null; then
  nohup node ... ticker --session "$KAOLA_SESSION_ID" >/dev/null 2>&1 &
  disown
fi
```

---

## LOW (fd semantics) — acquirePidFile returns closed fd
File: scripts/kaola-workflow-claim.js, lines 442–460

```js
function acquirePidFile(pidPath) {
  // ...
  let fd;
  try { fd = fs.openSync(pidPath, 'wx', 0o600); }   // line 452
  // ...
  fs.writeSync(fd, String(process.pid) + '\n');   // line 457
  fs.closeSync(fd);                                 // line 458 — closed here
  return fd;                                        // line 459 — but returns closed integer
}
// Caller (line 522):
if (acquirePidFile(pidPath) === null) return;
```

Fix: return `true` instead of `fd` on line 459. Update caller at line 522: already works (non-null truthy check), but semantics become correct.

---

## Security L1 — updateLeaseInPlace non-global replace
File: scripts/kaola-workflow-claim.js, lines 177–187

```js
const updated = content
  .replace(/^expires:.*$/m, 'expires: ' + lockData.expires)           // line 183
  .replace(/^last_heartbeat:.*$/m, 'last_heartbeat: ' + lockData.last_heartbeat);  // line 184
```

Missing `g` flag — only replaces first match. Fix: `/^expires:.*$/gm` and `/^last_heartbeat:.*$/gm`.

---

## Security L2 — git push missing `--` separator
File: scripts/kaola-workflow-claim.js, line 228

```js
execFileSync('git', ['push', 'origin', branch], { encoding: 'utf8' });
```

Fix: `execFileSync('git', ['push', 'origin', '--', branch], { encoding: 'utf8' });`

---

## Security I1 — match.issue_number not re-asserted Number.isFinite in runTick
File: scripts/kaola-workflow-claim.js, lines 494–495

```js
if (tickCount === 1 && match.claim_comment_id && match.issue_number) {
  const tbResult = runTiebreakerCheck(match.issue_number, ...
```

Only truthy check; no `Number.isFinite(match.issue_number)` re-assertion.
Fix: `if (tickCount === 1 && match.claim_comment_id && Number.isFinite(match.issue_number)) {`

---

## Test Framework
- Hand-rolled `assert()` function (lines 10–13), no external test framework
- Success signal: "Workflow walkthrough simulation passed" + exit 0
- Subprocess invocations: `spawnSync` (line 5 import)
- Epic 9 structure: outer block with shared temp dir, inner sub-test blocks (9A1..9D), each with own subTmp

## isSafeName reference pattern
`assert(isSafeName(...), ...)` used in multiple locations in claim.js as the guard pattern.
