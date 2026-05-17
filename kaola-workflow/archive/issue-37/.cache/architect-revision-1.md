# Code-Architect Revision 1 — Issue #37

## Changes From Original

**Fix 1 — `cmdWorktreeFinalize` lock file removal**: The original blueprint instructed reading `{coord_root}/kaola-workflow/.locks/{project}.lock` to obtain `worktree_path`. This is incorrect: `cmdPickNext` (by spec) never writes a `.locks/` file, so that read would always fail in native mode. The fix derives `worktreePath` via the existing `worktreePathFor(root, project)` function at line 587, which returns a fully deterministic path. No lock file is written or read by any of the 4 new subcommands.

**Fix 2 — `kaola-workflow-phase4.md` Worktree Discovery block lock file removal**: The original blueprint instructed resolving `ACTIVE_WORKTREE_PATH` from a lock file when `KAOLA_WORKTREE_NATIVE=1`. Same bug — no lock file exists in native mode. The fix uses the same deterministic formula `${COORD_ROOT%/}.kw/${KAOLA_PROJECT}` computed inline in bash. No new subcommand is needed for this.

**Fix 3 — `workflow-next.md` guard placement and line count claim corrected**: The original blueprint said "add +1 line at top of Startup Step 0 bash block" and claimed the file was 249 lines with a `<= 250` contract assertion. Both are wrong. Verified facts: the file is currently 248 lines; there is no line-count assertion in `validate-workflow-contracts.js` (only `assertIncludes` string-presence checks). The guard references `$CLAIM_JS`, which is set on line 59 of the file, so the guard cannot precede that assignment. Correct placement: after the `KAOLA_STARTUP_SESSION=` assignment, before the `KAOLA_SINK_FLAG=""` line. After this single-line insertion the file becomes 249 lines. No contract is violated.

---

## Key Design Decisions

- **Pure additions only**: 4 new `cmd*` functions inserted as a block after line 2131, before `main()`. No existing function bodies touched.
- **Path derivation, no lock files**: `cmdPickNext` never writes a `.locks/` file. `cmdWorktreeFinalize` derives `worktreePath` via `worktreePathFor(root, project)` (line 587), which is deterministic and requires no lock file. Same formula applies in the bash block added to `kaola-workflow-phase4.md`.
- **workflow-next.md guard placement**: Guard goes AFTER `KAOLA_STARTUP_SESSION=...` and BEFORE `KAOLA_SINK_FLAG=""`, because `$CLAIM_JS` must be set before the guard can reference it. File goes from 248 → 249 lines. No line-count assertion exists in `validate-workflow-contracts.js`.
- **Phase 4 CWD**: New "Worktree Discovery" block added to `kaola-workflow-phase4.md` after line 55; resolves `ACTIVE_WORKTREE_PATH` via inline formula `${COORD_ROOT%/}.kw/${KAOLA_PROJECT}` when `KAOLA_WORKTREE_NATIVE=1`, falling back to `$(pwd)` otherwise.
- **Plugin walkthrough**: New test is Case 5k (Case 5j already exists at line 1123).
- **Drift guard is same-commit**: Every commit modifying `scripts/kaola-workflow-claim.js` or `scripts/validate-workflow-contracts.js` must also update the byte-identical plugins mirror in the same commit.
- **Each commit stays green**: Validator asserts, implementation, and test coverage for each scope go into the same commit.
- **`cmdResume` main-worktree discovery**: First `worktree` entry from `git worktree list --porcelain` is always the main worktree (git guarantee).
- **`cmdPickNext` OFFLINE behavior**: Online = `git ls-remote --heads origin 'refs/heads/workflow/issue-*'` + local branches. Offline = local branches only.

---

## New Functions to Add (before `main()` at line 2133)

### `cmdPickNext()`

- Parse `--session`, `--runtime`, `--sink`, `--issue` args
- Build set of already-claimed issues via `git branch --list 'workflow/issue-*'` + `git ls-remote` (online)
- Fetch open issues via `gh issue list` (online) or ROADMAP.md (offline/fallback)
- Filter to unclaimed; attempt `provisionWorktree()` for first candidate; retry on failure (lost race)
- Set `workflow:in-progress` label via `gh issue edit` (online only)
- Emit: `{verdict:'acquired', issue, project, branch, worktree_path, session, runtime, sink}`
- On no candidates: `{verdict:'none', reason:'no-unclaimed-issues'}`

### `cmdResume()`

- Parse `--session`, `--project` args
- Find main worktree: first `worktree` line from `git worktree list --porcelain`
- If no `--project`: infer from current branch `workflow/issue-N`
- Scan phase artifacts from main worktree: phase6→complete, phase5→phase6, phase4→phase4/phase5, phase3→phase4, phase2→phase3, phase1→phase2, none→phase1
- Emit: `{resumed:true, issue, project, branch, main_worktree, current_phase, next_command}` or `{resumed:false}`

### `cmdWorktreeStatus()`

- Parse `git worktree list --porcelain`; filter to `workflow/issue-*` branches
- For each: hydrate with `gh issue view N --json state,assignees,labels,title,number,url` (online)
- Emit: JSON array of `{worktree_path, branch, head, issue, issue_data}`

### `cmdWorktreeFinalize()` — Fix 1 applied

- Parse `--project`, `--session` args; assert project present
- Get `root = getCoordRoot()` and `worktreePath = worktreePathFor(root, project)` — the same deterministic formula used by `provisionWorktree` (line 587: `path.join(path.dirname(root), path.basename(root) + '.kw', project)`). No lock file is read.
- Verify `worktreePath` exists on disk via `fs.existsSync(worktreePath)`; throw if not (means worktree not provisioned, implying `cmdPickNext` was not run or failed)
- Dirty-check ONLY `kaola-workflow/{project}/` paths in the issue worktree — NOT the full tree
- Find main worktree: first `worktree` entry from `git worktree list --porcelain` run in `root`
- Recursive copy `{main}/kaola-workflow/{project}/` → `{worktreePath}/kaola-workflow/{project}/`
- Stage (`git add kaola-workflow/{project}/`) and commit on issue branch; skip commit if nothing staged
- Emit: `{verdict:'finalized', project, worktree_path: worktreePath, branch, session}`

---

## `main()` Dispatcher — 4 lines to add after existing `finalize` line

```javascript
  if (sub === 'pick-next') return cmdPickNext();
  if (sub === 'resume') return cmdResume();
  if (sub === 'worktree-status') return cmdWorktreeStatus();
  if (sub === 'worktree-finalize') return cmdWorktreeFinalize();
```

Also update the usage string in the `assert(sub, ...)` call to include the new subcommands:

```javascript
assert(sub, 'usage: kaola-workflow-claim.js <claim|release|heartbeat|ticker|sweep|status|session|derive-session|can-handoff|handoff|verify-startup|patch-branch|watch-pr|bootstrap|startup|finalize|pick-next|resume|worktree-status|worktree-finalize>');
```

---

## `module.exports` Extension

```javascript
module.exports = { buildSinkBranchName, getCoordRoot, removeWorktree, archiveProjectDir,
                   cmdPickNext, cmdResume, cmdWorktreeStatus, cmdWorktreeFinalize };
```

---

## `scripts/validate-workflow-contracts.js` — After line 316

```javascript
// Issue #37 – worktree-native subcommands
assertIncludes('scripts/kaola-workflow-claim.js', 'cmdPickNext');
assertIncludes('scripts/kaola-workflow-claim.js', 'cmdResume');
assertIncludes('scripts/kaola-workflow-claim.js', 'cmdWorktreeStatus');
assertIncludes('scripts/kaola-workflow-claim.js', 'cmdWorktreeFinalize');
assertIncludes('scripts/kaola-workflow-claim.js', 'pick-next');
assertIncludes('scripts/kaola-workflow-claim.js', 'worktree-status');
assertIncludes('scripts/kaola-workflow-claim.js', 'worktree-finalize');
assertIncludes('scripts/simulate-workflow-walkthrough.js', 'Epic Case 17');
assertIncludes('commands/workflow-next.md', 'KAOLA_WORKTREE_NATIVE');
assertIncludes('commands/kaola-workflow-phase4.md', 'ACTIVE_WORKTREE_PATH');
```

---

## `scripts/simulate-workflow-walkthrough.js` — Epic Case 17

Insert before line 4703 (the `console.log('Workflow walkthrough simulation passed')` line). Structure: git-init temp dir, write gh shim, run subcommands via `execFileSync`:

- **17A**: `pick-next` acquires issue 701; assert `verdict=acquired`, `issue=701`, branch starts `workflow/`, `worktree_path` exists on disk
- **17B**: second `pick-next` (OFFLINE — `KAOLA_WORKFLOW_OFFLINE=1`) returns `{verdict:'none'}` — issue already branched locally
- **17C**: `worktree-status` lists the worktree; assert array length >= 1, branch matches, path matches
- **17D**: `resume` with no phase artifacts routes to `/kaola-workflow-phase1`
- **17E**: `resume` with `phase3-plan.md` present routes to `/kaola-workflow-phase4`
- **17F**: `worktree-finalize` copies artifacts and commits; assert file exists in worktree at `kaola-workflow/{project}/`

---

## `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — Case 5k

Insert after line 1126 (after the `finally` block of Case 5j closes, before `console.log('Kaola-Workflow walkthrough simulation passed')`). Tests `pick-next` + `worktree-status` round-trip with issue 801. Assert `verdict=acquired` from `pick-next` and that `worktree-status` returns a matching entry.

---

## `commands/workflow-next.md` — Guard Placement (Fix 3 applied)

Current file: 248 lines. After this change: 249 lines. No line-count assertion exists in `validate-workflow-contracts.js`.

Insert one line AFTER the `KAOLA_STARTUP_SESSION=` assignment and BEFORE the `KAOLA_SINK_FLAG=""` line:

```bash
  [ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ] && { node "$CLAIM_JS" pick-next --session "$KAOLA_STARTUP_SESSION" --runtime claude ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>&1; exit 0; } || true
```

Resulting block after edit:

```bash
if [ -f "$CLAIM_JS" ]; then
  KAOLA_STARTUP_SESSION="$(node "$CLAIM_JS" session 2>/dev/null || true)"
  [ -n "$KAOLA_STARTUP_SESSION" ] && export KAOLA_SESSION_ID="$KAOLA_STARTUP_SESSION"
  [ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ] && { node "$CLAIM_JS" pick-next --session "$KAOLA_STARTUP_SESSION" --runtime claude ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>&1; exit 0; } || true
  KAOLA_SINK_FLAG=""
  [ -n "${KAOLA_SINK:-}" ] && KAOLA_SINK_FLAG="--sink $KAOLA_SINK"
  STARTUP_OUT=$(node "$CLAIM_JS" startup \
    --session "$KAOLA_STARTUP_SESSION" \
    --runtime claude \
    $KAOLA_SINK_FLAG 2>/dev/null) || true
else
  echo "BLOCKED: kaola-workflow startup unavailable; cannot select issue-backed work without a startup receipt." >&2
  exit 1
fi
```

The `exit 0` inside the guard means that when `KAOLA_WORKTREE_NATIVE=1` is set, the script exits immediately after `pick-next` output is emitted. Normal (non-native) runs are unaffected because the guard short-circuits with `|| true`.

---

## `commands/kaola-workflow-phase4.md` — Worktree Discovery Block (Fix 2 applied)

Insert after line 55 (after the Startup Receipt Guard closing block, before the `## Prerequisite` heading or whatever follows line 55). No lock file is read. Path is computed inline:

```markdown
## Worktree Discovery

Resolve the active worktree path before running any git commands in this phase:

```bash
if [ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ]; then
  COORD_ROOT="$(git rev-parse --show-toplevel)"
  ACTIVE_WORKTREE_PATH="${COORD_ROOT%/}.kw/${KAOLA_PROJECT:-${PWD##*/}}"
else
  ACTIVE_WORKTREE_PATH="$(pwd)"
fi
export ACTIVE_WORKTREE_PATH
```

All subsequent `git -C`, `cp`, and path operations in Phase 4 use `$ACTIVE_WORKTREE_PATH` as the working root for issue-branch changes. When `KAOLA_WORKTREE_NATIVE=0` (default), `ACTIVE_WORKTREE_PATH` is the current directory, preserving existing behavior.
```

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `scripts/kaola-workflow-claim.js` | Add `cmdPickNext`, `cmdResume`, `cmdWorktreeStatus`, `cmdWorktreeFinalize` before line 2133; extend `main()` dispatcher and usage string; extend `module.exports` | P0 |
| `scripts/validate-workflow-contracts.js` | Add 10 `assertIncludes` lines after line 316 | P0 |
| `scripts/simulate-workflow-walkthrough.js` | Add Epic Case 17 (17A–17F) before line 4703 | P0 |
| `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` | Byte-identical mirror of `scripts/kaola-workflow-claim.js` changes | P0 |
| `plugins/kaola-workflow/scripts/validate-workflow-contracts.js` | Byte-identical mirror of validator changes | P0 |
| `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | Add Case 5k after line 1126 | P0 |
| `commands/workflow-next.md` | Insert 1-line guard after `KAOLA_STARTUP_SESSION=` line (248 → 249 lines) | P1 |
| `commands/kaola-workflow-phase4.md` | Insert Worktree Discovery block after line 55 | P1 |
| `CHANGELOG.md` | Add [Unreleased] entry for issue #37 | P2 |
| `README.md` | Document 4 new subcommands and `KAOLA_WORKTREE_NATIVE` env var | P2 |

---

## Build Sequence

### Step 1 — single commit (all must land together to keep `npm test` green)

1. Add `cmdPickNext`, `cmdResume`, `cmdWorktreeStatus`, `cmdWorktreeFinalize` to `scripts/kaola-workflow-claim.js` before line 2133
2. Extend `main()` dispatcher (add 4 `if (sub === ...)` lines) and update usage `assert` string
3. Replace `module.exports` at line 2158 with extended export list
4. Add 10 `assertIncludes` contract assertions to `scripts/validate-workflow-contracts.js` after line 316
5. Add Epic Case 17 (17A–17F) to `scripts/simulate-workflow-walkthrough.js` before line 4703
6. Add Case 5k to `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` after line 1126
7. Sync byte-identical mirrors: `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` and `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`

Validation: `node scripts/simulate-workflow-walkthrough.js` exits 0

### Step 2 — single commit

8. Insert 1-line `KAOLA_WORKTREE_NATIVE` guard into `commands/workflow-next.md` (after `KAOLA_STARTUP_SESSION=` line, before `KAOLA_SINK_FLAG=""` line)
9. Insert Worktree Discovery bash block into `commands/kaola-workflow-phase4.md` after line 55

Validation: `node scripts/simulate-workflow-walkthrough.js` exits 0

### Step 3 — single commit

10. Update `CHANGELOG.md` with [Unreleased] entry for issue #37 subcommands
11. Update `README.md` to document `pick-next`, `resume`, `worktree-status`, `worktree-finalize`, and `KAOLA_WORKTREE_NATIVE` env var

Validation: `node scripts/simulate-workflow-walkthrough.js` exits 0

---

## Task List

| Task | File | Depends On | Group |
|------|------|------------|-------|
| T1: `cmdPickNext` | `scripts/kaola-workflow-claim.js` | nothing | A |
| T2: `cmdResume` | `scripts/kaola-workflow-claim.js` | nothing | A |
| T3: `cmdWorktreeStatus` | `scripts/kaola-workflow-claim.js` | nothing | A |
| T4: `cmdWorktreeFinalize` (uses `worktreePathFor`, no lock file) | `scripts/kaola-workflow-claim.js` | nothing | A |
| T5: `main()` dispatcher + usage string + `module.exports` | `scripts/kaola-workflow-claim.js` | T1–T4 | A |
| T6: 10 validator `assertIncludes` | `scripts/validate-workflow-contracts.js` | T1–T5 | A |
| T7: Epic Case 17 (17A–17F) | `scripts/simulate-workflow-walkthrough.js` | T1–T4 | A |
| T8: Case 5k | `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` | T1, T3 | A |
| T9: drift mirrors | `plugins/kaola-workflow/scripts/kaola-workflow-claim.js` + `validate-workflow-contracts.js` | T1–T8 | A |
| T10: Phase 4 Worktree Discovery block (inline formula, no lock file) | `commands/kaola-workflow-phase4.md` | Step 1 green | B |
| T11: workflow-next guard (after `KAOLA_STARTUP_SESSION=`, before `KAOLA_SINK_FLAG=`) | `commands/workflow-next.md` | Step 1 green | B |
| T12: docs | `CHANGELOG.md`, `README.md` | Step 2 green | C |

---

## Integration Risks

1. `getCoordRoot()` in linked worktree: uses `git rev-parse --git-common-dir` which returns common .git from any worktree — safe
2. Epic Case 17B race test: sequential (17A writes branch, 17B checks it offline with `KAOLA_WORKFLOW_OFFLINE=1`) — reliable
3. `cmdWorktreeFinalize` dirty-check scope: implementation files outside `kaola-workflow/{project}/` are intentionally allowed dirty
4. `module.exports` extension: safe (no existing caller destructures new names)
5. workflow-next.md line count: 248 → 249 after +1 insert; no `<= 250` line-count assertion exists
6. Case 5k cleanup: `git worktree prune` before `fs.rmSync` (same as Epic Case 15 pattern)

## Explicit Out-of-Scope

- Phase 1, 2, 3, 5 command files: no worktree path changes
- All existing cmd* function bodies: untouched
- Lock file writes in cmdPickNext: no `.locks/` files written
- `--force-live-takeover` path: unchanged
- `validate-script-sync.js` file list: unchanged
- PR sink: unchanged
