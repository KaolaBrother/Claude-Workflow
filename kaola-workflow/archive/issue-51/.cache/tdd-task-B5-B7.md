# TDD Evidence: Tasks B5–B7

Generated: 2026-05-18

## Summary

Tasks B5 (Epic 20B post-completion no-auto-claim), B6 (cmdSweep second-pass step:complete archive branch + Epic 20D), and B7 (repair-state ownership refusal + cmdResume guard + Epic 20E) completed via TDD cycle.

---

## Files Modified

| File | Changes |
|------|---------|
| `scripts/simulate-workflow-walkthrough.js` | Epic 20B inserted after Epic 20A block; Epic 20D (RED→GREEN) inserted after Epic 20B; Epic 20E (RED→GREEN) inserted after Epic 20D; env portability fix: `runRepair` helper + direct `:176` invocation now set `KAOLA_SESSION_ID` in env; Epic 20F (B7a coverage) inserted after Epic 20E |
| `scripts/kaola-workflow-claim.js` | B6: hoist stateContent above phase*.md guard + step:complete archive branch in second-pass loop; B7b: cmdResume explicit-session ownership guard before scanPhaseArtifacts |
| `scripts/kaola-workflow-repair-state.js` | B7a: `ownedByCurrentSession` — `if (!sessionId) return true` → `if (!sessionId) return false` |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Synced after B6 + B7b edits |
| `plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js` | Synced after B7a edit |

---

## B5 — Epic 20B (post-completion no-auto-claim refusal)

### Test design

Setup: tmpdir + git init + archive dir with `phase6-summary.md` (no active project, no lock).

Assertions:
- `pick-next --session synthetic-20b-no-target --runtime claude` (no `--target-issue`, OFFLINE) → `verdict: 'none'`, `reason: 'no_target'`
- `startup --session synthetic-20b-startup --runtime claude` (no `--target-issue`, OFFLINE) → `verdict: 'no_target'`, `claim: 'none'`
- No lock file created in the locks dir

JSON shape verified by probing actual command output before writing assertions:
```
pick-next: {"verdict":"none","reason":"no_target","recovery":"Agent must select an issue explicitly and pass --target-issue N"}
startup: {"verdict":"no_target","claim":"none",...}
```

### RED evidence

Not required — per advisor V2, Epic 20B was expected to be immediately GREEN (existing #44 no-auto-pick path already in place).

### GREEN evidence

First run after insertion:
```
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed (exit 0)
```

**No implementation change required** — existing `cmdPickNext` and `cmdStartup` already refuse without `--target-issue`. Test added as regression coverage.

---

## B6 — cmdSweep second-pass step:complete archive branch

### Epic 20D — RED evidence

Inserted Epic 20D in `simulate-workflow-walkthrough.js`:
- Positive case: `foo-complete` dir with `step: complete` + `phase6-summary.md` + no lock → must be archived
- Negative case: `bar-finalval` with `step: final-validation` + `phase6-summary.md` + no lock → must NOT be archived

Before B6 implementation:
```
Error: Epic 20D: foo-complete (step:complete + phase6-summary.md) must be removed from kaola-workflow/
```

RED confirmed — the existing `phase*.md` guard at line 2196 skipped `foo-complete` because `phase6-summary.md` matches `/^phase\d/`.

### Implementation

**Location**: `scripts/kaola-workflow-claim.js` — second-pass loop in `cmdSweep`

**Before** (lines 2192–2200):
```js
const dirPath = path.join(kwDir, entry.name);
// Phase-artifacts-empty guard: skip if any phase*.md exists (real in-flight work)
let dirFiles = [];
try { dirFiles = fs.readdirSync(dirPath); } catch (_) { continue; }
if (dirFiles.some(f => /^phase\d/.test(f))) continue;
const stateContent = (() => {
  try { return fs.readFileSync(path.join(dirPath, 'workflow-state.md'), 'utf8'); } catch (_) { return ''; }
})();
if (field(stateContent, 'status') !== 'active') continue;
```

**After**:
```js
const dirPath = path.join(kwDir, entry.name);
let dirFiles = [];
try { dirFiles = fs.readdirSync(dirPath); } catch (_) { continue; }
// Hoist stateContent read so step:complete check fires before phase*.md guard
const stateContent = (() => {
  try { return fs.readFileSync(path.join(dirPath, 'workflow-state.md'), 'utf8'); } catch (_) { return ''; }
})();
// NEW: step:complete + phase6-summary.md present + no lock → archive as 'closed'
// (phase6-summary.md matches /^phase\d/ so must be checked before that guard)
if (field(stateContent, 'step') === 'complete' &&
    dirFiles.includes('phase6-summary.md') &&
    !fs.existsSync(lockPath(coordRoot, entry.name)) &&
    !fs.existsSync(lockPath(root, entry.name))) {
  try { archiveProjectDir(root, entry.name, 'closed'); } catch (_) {}
  continue;
}
// Phase-artifacts-empty guard: skip if any phase*.md exists (real in-flight work)
if (dirFiles.some(f => /^phase\d/.test(f))) continue;
if (field(stateContent, 'status') !== 'active') continue;
```

**Key insight**: `phase6-summary.md` matches the regex `/^phase\d/`, so the original guard would always skip dirs with `phase6-summary.md` before the step:complete check could fire. Hoisting `stateContent` and inserting the new branch BEFORE the guard resolves this.

**Test fix**: Epic 20D test also required creating the locks dir (`locksDirFor(workDir20d)`) before invoking sweep. The `cmdSweep` function returns early if `!fs.existsSync(dir)` where `dir` is the locks dir. Without the locks dir, sweep returns before reaching the second pass.

### GREEN evidence

After implementation:
```
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed (exit 0)
```

Positive case `foo-complete` archived to `kaola-workflow/archive/foo-complete/`. Negative case `bar-finalval` (step:final-validation) remains in place.

---

## B7 — repair-state + cmdResume ownership guards

### B7a — `ownedByCurrentSession` in `kaola-workflow-repair-state.js`

**Before** (line 115):
```js
if (!sessionId) return true;
```

**After**:
```js
if (!sessionId) return false;
```

**Impact analysis**: All existing sim tests that call `runRepair()` inherit `KAOLA_SESSION_ID = 'c90b...'` from the parent process env (confirmed by checking env). With `sessionId !== ''`, the `return false` branch is never taken. Then `projectOwner()` returns `''` for new/unlocked projects, and `!owner` evaluates to `true`, so `ownedByCurrentSession` returns `true`. No regressions.

**B7a test coverage (Epic 20F)**: Added Epic 20F to `simulate-workflow-walkthrough.js` to directly exercise the `return false` branch: sets up a project dir with phase artifacts and `session_id: sess-other-owner` in `workflow-state.md`, runs `repair-state.js test-b7a-project` with `KAOLA_SESSION_ID: ''`, and asserts the output includes "skipped" and "owned by another session", and that the state file is unchanged. This closes the advisor-identified gap — reverting B7a to `return true` would cause Epic 20F to fail.

**Portability gap and fix**: The advisor-flagged discriminating check (`env -u KAOLA_SESSION_ID ... node scripts/simulate-workflow-walkthrough.js`) confirmed failure when `KAOLA_SESSION_ID` is absent from the environment. Root cause: `runRepair()` helper and direct `:176` `execFileSync` both inherited env without explicit `KAOLA_SESSION_ID`. B7a's `return false` branch fires when `sessionId` is empty, blocking repair of legitimate brand-new projects. Fix: both invocation sites now set `env: { ...process.env, KAOLA_SESSION_ID: process.env.KAOLA_SESSION_ID || 'test-session-repair' }`. Discriminating check re-run confirms exit 0 after fix. This is a Trivial Inline Edit — mechanically obvious env addition in the test harness, not a behavior change to the implementation.

**GREEN evidence** (after B7a, before B7b):
```
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed (exit 0)
```

### B7b — cmdResume ownership guard

### Epic 20E — RED evidence

Inserted Epic 20E test: cross-session resume (--session sess-intruder-20e with lock owned by sess-owner-20e) must exit non-zero with `resumed: false` and `reason` containing "session mismatch".

Before B7b:
```
Error: Epic 20E: cross-session resume must exit non-zero, got exit 0,
output: {"resumed":true,"issue":null,"project":"test-resume-20e",...}
```

RED confirmed.

### Implementation

**Location**: `scripts/kaola-workflow-claim.js` — `cmdResume` function, between `const projectDir = ...` and `const { currentPhase, nextCommand } = scanPhaseArtifacts(projectDir);`

**Inserted**:
```js
const coordRoot = getCoordRoot();
// Ownership guard: only enforce when --session is explicitly provided.
// Permissive when no explicit --session (legacy resume) or no lock.
const explicitSession = args.session || '';
if (explicitSession) {
  const resumeLock = readJsonFile(lockPath(coordRoot, project));
  if (resumeLock && resumeLock.session_id && resumeLock.session_id !== explicitSession) {
    process.stdout.write(JSON.stringify({
      resumed: false,
      reason: 'session mismatch — project owned by ' + resumeLock.session_id
    }) + '\n');
    process.exitCode = 1;
    return;
  }
}
```

**Key deviation from spec**: The plan called for `currentSessionId(args, { fallback: false })`. This was changed to `args.session || ''` because `currentSessionId` also reads from `KAOLA_SESSION_ID` env var. Tests that don't pass explicit `--session` but have `KAOLA_SESSION_ID` set in the parent environment would incorrectly trigger the guard. Using `args.session` directly limits enforcement to explicit CLI `--session` flag only, preserving backward compatibility for legacy resume invocations. The "permissive when no sessionId" clause is correctly implemented.

**Regression identified and fixed**: Initial implementation using `currentSessionId(args, { fallback: false })` broke test 17D: `resume --project issue-701` (no `--session` arg) runs with `KAOLA_SESSION_ID = 'c90b...'` in env, but the lock has `session_id: 'sess-epic17'` → mismatch. Fix: use only `args.session` (explicit CLI flag).

**Three-case verification** (manual):
```
Cross-session (--session sess-intruder-20e, lock=sess-owner-20e):
  {"resumed":false,"reason":"session mismatch — project owned by sess-owner-20e"}  exit 1 ✓

Matching session (--session sess-owner-20e, lock=sess-owner-20e):
  {"resumed":true,...}  exit 0 ✓

No --session (KAOLA_SESSION_ID=c90b-some-env, lock=sess-owner-20e, legacy path):
  {"resumed":true,...}  exit 0 ✓
```

### GREEN evidence

After B7b fix:
```
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed (exit 0)
```

---

## Commands Run

```bash
# Pre-flight probe: pick-next and startup JSON shape
node scripts/kaola-workflow-claim.js pick-next --session probe-shape --runtime claude
# Output: {"verdict":"none","reason":"no_target","recovery":"..."}

# B5: Epic 20B insertion + immediate GREEN
node scripts/simulate-workflow-walkthrough.js → passed (exit 0)  [B5 GREEN on insert]

# B6: Epic 20D RED verification
node scripts/simulate-workflow-walkthrough.js → Error: Epic 20D: foo-complete...  [confirmed RED]

# B6: After claim.js edit + locksDirFor fix
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed (exit 0)

# B7a: After repair-state.js edit
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed (exit 0)

# B7b: Epic 20E RED verification
node scripts/simulate-workflow-walkthrough.js → Error: Epic 20E: cross-session resume...  [confirmed RED]

# B7b: After initial (broken) cmdResume edit — REGRESSION
node scripts/simulate-workflow-walkthrough.js → Error: Command failed: ...resume --project issue-701
# Root cause: currentSessionId() reads KAOLA_SESSION_ID from env even without --session arg

# B7b: After fix (args.session instead of currentSessionId)
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed (exit 0)

# Sync repair-state.js to plugin tree (missed in initial B7a sync)
cp scripts/kaola-workflow-repair-state.js plugins/kaola-workflow/scripts/kaola-workflow-repair-state.js

# Advisor discriminating check — FAILED before env portability fix
env -u KAOLA_SESSION_ID -u CODEX_THREAD_ID -u CLAUDE_SESSION_ID node scripts/simulate-workflow-walkthrough.js
# → Error: repair must not create state for brand-new work

# Env portability fix: added KAOLA_SESSION_ID to runRepair() and direct :176 execFileSync
# Discriminating check re-run — PASSED after fix
env -u KAOLA_SESSION_ID -u CODEX_THREAD_ID -u CLAUDE_SESSION_ID node scripts/simulate-workflow-walkthrough.js
# → Workflow walkthrough simulation passed (exit 0)

# Final gate: all 5 validators
node scripts/simulate-workflow-walkthrough.js → Workflow walkthrough simulation passed (exit 0)
node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js → Kaola-Workflow walkthrough simulation passed (exit 0)
node scripts/validate-script-sync.js → OK: 7 common scripts in sync. (exit 0)
node scripts/validate-workflow-contracts.js → Workflow contract validation passed (exit 0)
node scripts/validate-kaola-workflow-contracts.js → Kaola-Workflow contract validation passed (exit 0)
```

---

## Deviations from Plan

| Deviation | Reason | Impact |
|-----------|--------|--------|
| B7b: `args.session` instead of `currentSessionId(args, { fallback: false })` | `currentSessionId` reads `KAOLA_SESSION_ID` env var, breaking existing test 17D which inherits env but uses a different session. `args.session` limits enforcement to explicit `--session` CLI flag only. | Correct behavior: cross-session resume blocked when `--session` explicitly passed; legacy resume (no `--session` flag) permissive. Consistent with "permissive when no sessionId" clause. |
| B6 Epic 20D test: added `locksDirFor(workDir20d)` creation | `cmdSweep` returns early if locks dir doesn't exist (`if (!fs.existsSync(dir)) return`). The plan didn't account for this guard. | Required for second-pass GC to execute at all. |
| repair-state.js synced separately (not bundled with claim.js sync) | Missed in initial B7a pass; caught by `validate-script-sync.js` gate. | Fixed immediately; no functional impact. |
| Env portability fix in test harness: `runRepair()` + direct `:176` now set explicit `KAOLA_SESSION_ID` | B7a `return false` branch fires when env has no `KAOLA_SESSION_ID`, blocking repair for brand-new projects. Discriminating check (`env -u KAOLA_SESSION_ID`) confirmed failure. | Fix applied as Trivial Inline Edit — test harness only; no implementation change. Discriminating check passes after fix. |

---

## Final Gate Status

| Gate | Command | Status | Exit Code |
|------|---------|--------|-----------|
| Gate 1 | `node scripts/simulate-workflow-walkthrough.js` | PASS | 0 |
| Gate 2 | `node plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | PASS | 0 |
| Gate 3 | `node scripts/validate-script-sync.js` | PASS | 0 |
| Gate 4 | `node scripts/validate-workflow-contracts.js` | PASS | 0 |
| Gate 5 | `node scripts/validate-kaola-workflow-contracts.js` | PASS | 0 |
| Gate 6 (env portability) | `env -u KAOLA_SESSION_ID -u CODEX_THREAD_ID -u CLAUDE_SESSION_ID node scripts/simulate-workflow-walkthrough.js` | PASS | 0 |
| B7a coverage (Epic 20F) | Included in Gate 1 and Gate 6; Epic 20F directly exercises `ownedByCurrentSession return false` branch | PASS | 0 |
