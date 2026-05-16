# Security Review: kaola-workflow Phase 4 — Multi-session Worktree Isolation

**Scope:** `scripts/kaola-workflow-claim.js`, `hooks/kaola-workflow-pre-commit.sh`, `scripts/kaola-workflow-repair-state.js`, `scripts/kaola-workflow-sink-merge.js`
**npm audit:** 0 vulnerabilities found

---

## Phase 6 Gate: UNBLOCKED

No CRITICAL or HIGH issues found.

---

## MEDIUM — Inconsistent `isSafeName` implementations across three files

**Files:** `scripts/kaola-workflow-repair-state.js` vs `scripts/kaola-workflow-claim.js` and `scripts/kaola-workflow-sink-merge.js`

`repair-state.js` uses `Boolean(name)` (passes non-string truthies), omits the `typeof` guard, and omits the null-byte check. `claim.js` and `sink-merge.js` check `typeof name === 'string'`, `name.length > 0`, and `!name.includes('\0')`. Practical impact near-zero in current use, but validators will diverge further over time.

**Recommendation:** Extract shared `isSafeName` utility or copy the full implementation from `claim.js` into `repair-state.js`.

---

## LOW — Lock file mode `0o600` not enforced on update writes (4 sites)

**File:** `scripts/kaola-workflow-claim.js` — heartbeat, ticker, patch-branch, watch-pr update writes

`fs.writeFileSync` calls at ~4 sites update existing lock files without `{ mode: 0o600 }`. In Node.js, `mode` applies only on `O_CREAT`; existing files retain their current permissions. Normal flow: lock already at `0o600` from initial write. Residual risk: if lock unlinked between read and write (race with sweep), `writeFileSync` recreates at umask-default (typically 0o644). Single-user developer workstation: negligible.

**Recommendation:** Add `{ mode: 0o600 }` to the four update writes for defense-in-depth.

---

## LOW — `migrateLegacyCoordState` does not detect symlinks before `fs.linkSync`

**File:** `scripts/kaola-workflow-claim.js` (migrateLegacyCoordState)

If a legacy file is a symlink, `fs.linkSync` creates a hardlink to the symlink inode (not the target). Subsequent `fs.unlinkSync` removes the original symlink. In practice, the legacy directory is only populated by prior `claim.js` runs; external actors cannot plant symlinks there without existing filesystem write access.

**Recommendation:** Add `fs.lstatSync` check and skip symlinks during migration.

---

## LOW — `cmdHandoff` carries `worktree_path` forward without re-validation

**File:** `scripts/kaola-workflow-claim.js` (`cmdHandoff`)

`Object.assign({}, existing, { session_id, ... })` forwards `worktree_path` from existing lock. If existing lock was tampered with, poisoned `worktree_path` propagates. `removeWorktree` calls `realpathSync` first (normalizes traversal), limiting blast radius to a read-only existence probe. Trust boundary: local `.git/` directory.

**Recommendation:** Strip `worktree_path` in `cmdHandoff` and let `provisionWorktree` regenerate it.

---

## LOW — `branch` arg in `sink-merge.js` passes to `git checkout` without `--` separator

**File:** `scripts/kaola-workflow-sink-merge.js` (~lines 89, 99, 114, 173)

`['checkout', args.branch]` without `'--'`. `!args.branch.startsWith('-')` validation blocks flag injection. Branch delete calls already use `--`. Inconsistency is style/defense-in-depth.

**Recommendation:** Change to `['checkout', '--', args.branch]` at the affected lines.

---

## LOW — `repair-state.js` probes path from `phase_file` state file content

**File:** `scripts/kaola-workflow-repair-state.js` (~line 321)

`phase_file` read from workflow-state.md content, then `path.join(root, phaseFile)` passed to `exists()`. Adversarial `phase_file` value could cause a read-only filesystem path oracle. Requires write access to workflow-state.md (implies existing filesystem access).

**Recommendation:** Validate `phaseFile` resolves within repo root before calling `exists()`.

---

## Items Checked and Found Clean

| Check | Result |
|---|---|
| Hardcoded secrets | None found |
| Shell injection via user-controlled values | Not present — all subprocess calls use `execFileSync` with array args |
| `KAOLA_SESSION_ID` injection in bash hook | Safe — compared with double-quoting |
| Path traversal via `--project` | Blocked by `isSafeName` at all entry points |
| Path traversal via `--session` | Blocked by `assertSafeSession` → `isSafeName` |
| O_EXCL atomic lock write semantics | Correct — single attempt, `EEXIST` → exit 2 |
| `execFileSync` vs `exec`/`spawn` with shell | All subprocess calls use `execFileSync` with array args |
| COORD_ROOT derivation safety in pre-commit.sh | Safe — output resolved via `realpath` in subshell |
| Shell variable quoting in pre-commit.sh | All vars double-quoted at use sites |
| `realpathSync` CWD protection in `removeWorktree` | Correct — both sides resolved before compare |
| `claim_comment_id` validation | Validated with `/^\d+$/` before every GitHub API call |
| Session file and startup receipt permissions | Written at `0o600` |
| Direct HTTP calls (SSRF) | None — all network calls go through `gh` CLI with array args |
| `pr_url` in `gh pr view` | Gated on `startsWith('https://')` check |

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 0 |
| MEDIUM   | 1 |
| LOW      | 5 |

**Phase 6 is unblocked.**
