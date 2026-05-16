# Code Review: Phase 4 — Multi-session Worktree Isolation (Issue #30)

**Files reviewed:** `scripts/kaola-workflow-claim.js`, `hooks/kaola-workflow-pre-commit.sh`, `scripts/kaola-workflow-sink-merge.js`, `scripts/kaola-workflow-repair-state.js`, `scripts/simulate-workflow-walkthrough.js`, plugin mirrors, SKILL.md files

---

## MEDIUM — provisionWorktree: bare string includes() causes false-positive resume

File: `scripts/kaola-workflow-claim.js` (provisionWorktree function, line ~450)

`git worktree list --porcelain` emits lines of the form `worktree /path/to/dir`. A bare `includes(wtPath)` match will fire if `wtPath` is a substring of a longer path (e.g., `.../issue-501` matches inside `.../issue-5010`). New claim returns without creating the worktree; lock is patched with a `worktree_path` that does not exist.

Fix: `listOut.includes('worktree ' + wtPath + '\n')`

---

## MEDIUM — cmdClaim: legacy lock re-claim regression (pre-Phase-4 format)

File: `scripts/kaola-workflow-claim.js` (cmdClaim)

When an existing lock was written by pre-Phase-4 claim, `worktree_path` is absent. Resume detection checks `if (existingLock.worktree_path)` — `undefined` is falsy, so neither resume branch fires. Execution falls through to `issueAlreadyClaimed` → exit 2.

A session owning a project before the Phase-4 upgrade cannot re-claim it without first releasing.

Fix: add a third branch for `existingLock.session_id === args.session && !existingLock.worktree_path` — skip `issueAlreadyClaimed`, proceed to `provisionWorktree`.

---

## MEDIUM — Walkthrough test 15E: missing patch-branch assertion

File: `scripts/simulate-workflow-walkthrough.js` (Case 15E)

Verifies `"worktree missing at"` in stderr and `"git worktree add"` but does not assert the lock's `branch` field after recovery. `patchBranch` path untested for the missing-worktree scenario.

---

## MEDIUM — Walkthrough test 16B: missing branch-preservation assertion

File: `scripts/simulate-workflow-walkthrough.js` (Case 16B)

Verifies lock and worktree gone after CLOSED, but does not assert that `git branch --list <feature-branch>` still returns the branch name. If `cmdWatchPr` incorrectly deletes the branch on CLOSED, no test will catch it.

---

## LOW — migrateLegacyCoordState: EXDEV branch leaks file descriptor

File: `scripts/kaola-workflow-claim.js` (migrateLegacyCoordState, ~line 124)

`fs.openSync(newPath, 'wx')` returns a fd that is never stored or closed. Short-lived CLI process so no data loss risk, but leaks N fds across a cross-filesystem migration.

Fix: `const fd = fs.openSync(newPath, 'wx'); fs.closeSync(fd);`

---

## NOTE — SKILL.md worktree shim: 3 of 9 files intentionally missing

`kaola-workflow-init.md`, `kaola-workflow-next.md`, and `kaola-workflow-next-pr.md` do not contain the `cd "$KAOLA_WORKTREE_PATH"` shim. These three files do not have a Session Heartbeat bash block. 6/9 coverage is correct given the constraint. No action needed.

---

## Confirmed Correct

- **`removeWorktree` CWD-protection comparator** — `cwdReal === wtReal || cwdReal.startsWith(wtReal + path.sep)` is correct.
- **`migrateLegacyCoordState` EEXIST idempotency** — EEXIST on `linkSync` or `openSync` is caught and skipped.
- **`cmdClaim` ordering** — migrate → mkdir → resume detection → `issueAlreadyClaimed` → single O_EXCL write → GitHub claim + tiebreaker → `provisionWorktree` (OFFLINE-guarded) → lock patch → `updateSinkLease`. Correct.
- **`cmdWatchPr` removeWorktree coverage** — called in both MERGED and CLOSED paths.
- **`cmdSweep` post-loop cleanup** — `git worktree prune` + `drainPendingRemovals` after sweep loop.
- **Pre-commit COORD_ROOT shell logic** — correct; `bash -n` passes.
- **`getCoordRoot()` resolution** — `path.resolve(root, raw)` handles both absolute (worktrees) and relative (primary) outputs.
- **Plugin mirrors** — byte-for-byte identical to `scripts/` counterparts.
- **Test suite** — `node scripts/simulate-workflow-walkthrough.js` exits 0.

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 0 |
| MEDIUM   | 4 |
| LOW      | 1 |

**Verdict: APPROVE — Phase 6 is not blocked.** MEDIUM findings are real but produce no data loss or security vulnerability in the current test corpus. Recommend tracking as follow-ups.
