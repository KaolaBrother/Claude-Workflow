# Code Explorer: claim-hardening

## M1 — Stale Sink block on re-claim

**`updateSinkLease` call in `cmdClaim` (line 235):**
```
updateSinkLease(stateFile, finalLock);
```

**`buildSinkBlock` (lines 97–111):**
Writes `issue_number` and `claimed_at` from `lockData`. Source: `lockData.issue_number` from `args.issue` (line 207), `lockData.claimed_at` from `now.toISOString()` (line 203). `finalLock` always carries fresh values.

**Sink-replace regex (lines 132–137):**
```js
let updated = content.replace(
  /\n## Sink[\s\S]*?(?=\n## [^SL]|\n## L|$)/,
  sinkBlock
);
updated = updated.replace(/(?:^|\n)(## Lease[\s\S]*?)(?=\n##|[\s]*$)/, '\n' + leaseBlock.slice(1));
```
The lookahead `\n## [^SL]` matches any header that doesn't start with S or L. The non-greedy `[\s\S]*?` combined with the alternated lookahead `\n## L` may fail to correctly match through the Lease section boundary when the document ends with `## Sink` followed by `## Lease`.

**Conclusion for M1:** The `issue_number`/`claimed_at` data is always fresh in `finalLock`. The bug appears to be in regex matching when `## Sink` is followed by `## Lease` — the replacement may leave both blocks incoherent. The fix should ensure `updateSinkLease` always replaces both blocks cleanly.

---

## M2 — `updateLeaseInPlace` silent no-op

**Full function body (lines 140–150):**
```js
function updateLeaseInPlace(stateFile, lockData) {
  if (!fs.existsSync(stateFile)) return;
  const content = fs.readFileSync(stateFile, 'utf8');
  if (!/^## Lease\s*$/m.test(content)) return;  // ← silent early return

  const updated = content
    .replace(/^expires:.*$/m, 'expires: ' + lockData.expires)
    .replace(/^last_heartbeat:.*$/m, 'last_heartbeat: ' + lockData.last_heartbeat);

  fs.writeFileSync(stateFile, updated);
}
```

**Called from:**
- Line 293: `cmdHeartbeat()` — every heartbeat update silently no-ops if `## Lease` missing.
- Line 446: `cmdWatchPr()` — watch-pr open-PR heartbeat silently no-ops.

**Stderr warning pattern (process.stderr.write):**
- Line 243: `process.stderr.write('release: no lock found for session ' + sessionId + ... + '\n');`
- Line 420: `process.stderr.write('watch-pr: gh pr view failed for ' + lock.pr_url + '\n');`

Fix: add `process.stderr.write('updateLeaseInPlace: ## Lease section missing in ' + stateFile + '\n');` before the silent return.

---

## S-L1 — File permissions 0644

**fs.openSync lock file (no mode, line 153):**
```js
const fd = fs.openSync(lp, 'wx');  // defaults to 0o666 & ~umask
```
Fix: `fs.openSync(lp, 'wx', 0o600)`

**fs.writeFileSync session file (no mode, line 171):**
```js
fs.writeFileSync(sessionPath(root, sessionId), JSON.stringify(sess, null, 2) + '\n');
```
Fix: add `{ mode: 0o600 }` options object.

**fs.writeFileSync lock re-write after comment (no mode, line 231):**
```js
fs.writeFileSync(lp, JSON.stringify(finalLock, null, 2) + '\n');
```
Fix: add `{ mode: 0o600 }` options object.

**Other lock re-writes (already existing files — mode set at creation):**
- Line 290: heartbeat re-write
- Line 377: patch-branch re-write
- Line 444: watch-pr re-write

**Note:** `getMachineId` at lines 43–45 creates `~/.config/kaola-workflow/machine-id` — config file, not lock/session, defer.

**Node.js API:** `fs.openSync(path, flags, mode)` and `fs.writeFileSync(path, data, { mode })` both support mode in all Node.js versions ≥12.

---

## S-L2 — `claim_comment_id` unescaped

**Where sourced:**
- Initially null: line 208 `claim_comment_id: null`
- Populated: lines 221–223 via `postGitHubClaim(args.issue, args.session)`
- `postGitHubClaim` (lines 174–180): parses GitHub API output with `out.match(/comments\/(\d+)/)` — digit-only at extraction point
- `finalLock`: `Object.assign({}, lockData, { claim_comment_id: commentId })` at lines 226–228

**Written to state file (lines 123–124):**
```js
'claim_comment_id: ' + (lockData.claim_comment_id || 'N/A')
```
No validation before write.

**Existing integer-validation patterns:**
- `cmdPatchBranch` line 386: `/^\d+$/.test(lock.claim_comment_id)` — same field, used before `gh` call
- `cmdClaim` line 188–190: `Number.isFinite(args.issue) && args.issue > 0` for user-provided integers
- `parseArgs` line 54: `args.issue = parseInt(argv[++i], 10)`

Fix: validate `commentId` with `/^\d+$/.test(commentId)` before writing to state file (consistent with line 386 pattern).

---

## INFO — `cmdStatus` missing `isSafeName` guard

**`isSafeName` definition (lines 12–16):**
```js
function isSafeName(name) {
  return typeof name === 'string' && name.length > 0 &&
    !name.includes('/') && !name.includes('\\') &&
    !name.includes('\0') && name !== '.' && name !== '..';
}
```

**`cmdRelease` guards (lines 247–248):**
```js
assert(isSafeName(match.project), 'lock file has invalid project field');
assert(isSafeName(match.session_id), 'lock file has invalid session_id field');
```

**`cmdHeartbeat` guards (lines 280–281):**
```js
assert(isSafeName(match.project), 'lock file has invalid project field');
assert(isSafeName(match.session_id), 'lock file has invalid session_id field');
```

**`cmdStatus` unguarded call (line 330):**
```js
const session = readSessionFile(root, lock.session_id);
```
`sessionPath` at line 64: `path.join(sessionsDir(root), sessionId + '.json')` — `lock.session_id` flows directly into `path.join` without `isSafeName` guard.

Fix: add `isSafeName(lock.session_id)` guard before line 330 (skip/continue if invalid, consistent with read-only cmdStatus behavior).

---

## Naming & File Organization Conventions

- Utilities first, then command implementations, then `main()`, then entry point try/catch
- `cmdXxx` naming for command functions, camelCase helpers
- `process.stderr.write(msg + '\n')` for non-fatal warnings
- `assert(cond, msg)` → throws → caught at entry point for fatal argument validation
- CommonJS `require`, no classes/prototypes
- Exit codes: 1 = general error, 2 = concurrency/lock conflict

---

## Test Patterns

- **Framework:** Hand-rolled `assert(condition, message)` in simulate-workflow-walkthrough.js (lines 10–14)
- **Structure:** `main()` with sequential `execFileSync` subprocess calls + inline assertions
- **Isolation:** `mkdtempSync` temp dir per Epic Case, custom HOME + `KAOLA_WORKFLOW_OFFLINE=1` env
- **claim.js tests:** Epic Case 1 (lines 329–408) — tests claim, heartbeat, status, second-claim-block, sweep, release
- **File assertions:** `JSON.parse(fs.readFileSync(...))` + field checks
- **Exit-code assertions:** `spawnSync` status checks

---

## Key File:Line Summary

| Item | Location | Lines |
|------|----------|-------|
| M1 — `updateSinkLease` function | claim.js | 113–138 |
| M1 — `buildSinkBlock` | claim.js | 97–111 |
| M1 — `updateSinkLease` call in `cmdClaim` | claim.js | 235 |
| M1 — Sink-replace regex (bug site) | claim.js | 132–137 |
| M2 — `updateLeaseInPlace` function | claim.js | 140–150 |
| M2 — Silent early-return | claim.js | 143 |
| M2 — Called from `cmdHeartbeat` | claim.js | 293 |
| M2 — Called from `cmdWatchPr` | claim.js | 446 |
| S-L1 — `fs.openSync` lock (no mode) | claim.js | 153 |
| S-L1 — `fs.writeFileSync` session (no mode) | claim.js | 171 |
| S-L1 — `fs.writeFileSync` lock re-write (no mode) | claim.js | 231 |
| S-L2 — `claim_comment_id` null init | claim.js | 208 |
| S-L2 — `claim_comment_id` populated | claim.js | 221–223 |
| S-L2 — Written to state file unvalidated | claim.js | 123–124 |
| S-L2 — Existing `^\d+$` pattern | claim.js | 386 |
| INFO — `isSafeName` definition | claim.js | 12–16 |
| INFO — `cmdRelease` guards | claim.js | 247–248 |
| INFO — `cmdHeartbeat` guards | claim.js | 280–281 |
| INFO — `cmdStatus` unguarded call | claim.js | 330 |
| INFO — `sessionPath` join target | claim.js | 64 |
