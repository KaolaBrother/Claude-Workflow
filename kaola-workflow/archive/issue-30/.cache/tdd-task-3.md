# TDD Task 3 (PR1-C-6) — COORD_ROOT Lock Path Migration

## Task Summary

Updated `hooks/kaola-workflow-pre-commit.sh` to derive lock file location from
`COORD_ROOT` (the shared `.git` directory resolved via `git rev-parse --git-common-dir`)
instead of `GIT_ROOT` (the worktree root). This makes the lock visible from any
linked worktree sharing the same object store.

## TDD Cycle

### RED (baseline)

Before changes, confirmed existing script passes syntax check:

```
bash -n hooks/kaola-workflow-pre-commit.sh
EXIT: 0 (syntax OK)
```

### Changes Made

**File:** `hooks/kaola-workflow-pre-commit.sh`

1. After line 4 (`GIT_ROOT=...`), added COORD_ROOT derivation (lines 5-6):

```bash
COORD_ROOT="$(git rev-parse --git-common-dir 2>/dev/null)" || COORD_ROOT=""
[ -n "$COORD_ROOT" ] && COORD_ROOT="$(cd "$GIT_ROOT" && realpath "$COORD_ROOT" 2>/dev/null)" || COORD_ROOT="$GIT_ROOT/.git"
```

   - `git rev-parse --git-common-dir` returns the shared `.git` directory (same
     for all worktrees sharing an object store).
   - `realpath` resolves to an absolute path relative to `GIT_ROOT`.
   - If resolution fails, falls back to `$GIT_ROOT/.git`.

2. Changed lock file line (was line 54, now line 56) from `$GIT_ROOT` to `$COORD_ROOT`:

```bash
LOCK_FILE="$COORD_ROOT/kaola-workflow/.locks/${PROJECT}.lock"
```

3. Added comment and legacy fallback immediately after (lines 57-60):

```bash
# Legacy fallback: if lock not found at COORD_ROOT path, try GIT_ROOT path
if [ ! -f "$LOCK_FILE" ]; then
  LOCK_FILE="$GIT_ROOT/kaola-workflow/.locks/${PROJECT}.lock"
fi
```

   This preserves backwards compatibility: existing locks written at the old
   `GIT_ROOT` path are still honoured until they are superseded by COORD_ROOT
   locks written by the updated claim script.

### GREEN (validation)

After changes, syntax check exits 0:

```
bash -n hooks/kaola-workflow-pre-commit.sh
EXIT: 0 (syntax OK)
```

## Logic Flow (post-change)

```
COORD_ROOT = realpath(git rev-parse --git-common-dir) || GIT_ROOT/.git
LOCK_FILE  = $COORD_ROOT/kaola-workflow/.locks/${PROJECT}.lock
if LOCK_FILE not found:
    LOCK_FILE = $GIT_ROOT/kaola-workflow/.locks/${PROJECT}.lock  # legacy
if LOCK_FILE exists:
    read session_id from lock JSON
elif workflow-state.md exists:
    read session_id from state file
if session_id != $KAOLA_SESSION_ID:
    BLOCKED (exit 2)
```

## Notes

- Full cross-worktree coverage (Epic Case 16H) requires the coordinated lock
  write path in the claim script (separate task) to be complete before end-to-end
  testing is meaningful.
- The legacy fallback ensures zero regression for single-worktree setups that
  wrote locks at the old `GIT_ROOT` path.
