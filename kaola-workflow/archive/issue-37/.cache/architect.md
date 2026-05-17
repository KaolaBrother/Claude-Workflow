# Code-Architect Output — Issue #37

## Key Design Decisions

- **Pure additions only**: 4 new cmd* functions inserted as a block after line 2131, before `main()`. No existing function bodies touched.
- **workflow-next.md 1-line budget**: Currently 249 lines; contract asserts `<= 250`. Guard is a single `[ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ] && { ... } || true` line at top of Startup Step 0.
- **Phase 4 CWD**: New "Worktree Discovery" block added to `kaola-workflow-phase4.md` after line 55; resolves `ACTIVE_WORKTREE_PATH` from lock file when `KAOLA_WORKTREE_NATIVE=1`.
- **Plugin walkthrough**: New test is Case 5k (Case 5j already exists at line 1123).
- **Drift guard is same-commit**: Every commit modifying `scripts/kaola-workflow-claim.js` or `scripts/validate-workflow-contracts.js` must also update the byte-identical plugins mirror in the same commit.
- **Each commit stays green**: Validator asserts, implementation, and test coverage for each scope go into the same commit.
- **`cmdResume` main-worktree discovery**: First `worktree` entry from `git worktree list --porcelain` is always the main worktree (git guarantee).
- **`cmdPickNext` OFFLINE behavior**: Online = `git ls-remote --heads origin 'refs/heads/workflow/issue-*'` + local branches. Offline = local branches only.

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

### `cmdWorktreeFinalize()`
- Parse `--project`, `--session` args; assert project present
- Read lock file at `{coord_root}/kaola-workflow/.locks/{project}.lock` for `worktree_path`
- Dirty-check ONLY `kaola-workflow/{project}/` paths in issue worktree (NOT full tree)
- Find main worktree (first `worktree` from porcelain)
- Recursive copy `{main}/kaola-workflow/{project}/` → `{worktree}/kaola-workflow/{project}/`
- Stage and commit on issue branch; skip commit if nothing staged
- Emit: `{verdict:'finalized', project, worktree_path, branch, session}`

## `main()` Dispatcher — 4 lines to add after existing finalize line

```javascript
  if (sub === 'pick-next') return cmdPickNext();
  if (sub === 'resume') return cmdResume();
  if (sub === 'worktree-status') return cmdWorktreeStatus();
  if (sub === 'worktree-finalize') return cmdWorktreeFinalize();
```

Also update usage string in the `assert(sub, ...)` to include new subcommands.

## `module.exports` Extension

```javascript
module.exports = { buildSinkBranchName, getCoordRoot, removeWorktree, archiveProjectDir,
                   cmdPickNext, cmdResume, cmdWorktreeStatus, cmdWorktreeFinalize };
```

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

## `scripts/simulate-workflow-walkthrough.js` — Epic Case 17

Insert before line 4703. Structure: git-init temp dir, write gh shim, run subcommands via `execFileSync`:
- **17A**: `pick-next` acquires issue 701; assert `verdict=acquired`, `issue=701`, branch starts `workflow/`, worktree_path exists
- **17B**: second `pick-next` (OFFLINE) returns `{verdict:'none'}` — issue already branched
- **17C**: `worktree-status` lists the worktree; assert array length >= 1, branch matches, path matches
- **17D**: `resume` with no phase artifacts routes to `/kaola-workflow-phase1`
- **17E**: `resume` with `phase3-plan.md` present routes to `/kaola-workflow-phase4`
- **17F**: `worktree-finalize` copies artifacts and commits; assert file exists in worktree

## `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js` — Case 5k

After line 1126. Tests `pick-next` + `worktree-status` round-trip with issue 801.

## `commands/workflow-next.md` — +1 line at top of Startup Step 0 bash block

```bash
[ "${KAOLA_WORKTREE_NATIVE:-0}" = "1" ] && { node "$CLAIM_JS" pick-next --session "$KAOLA_STARTUP_SESSION" --runtime claude ${KAOLA_SINK:+--sink $KAOLA_SINK} 2>&1; exit 0; } || true
```

## `commands/kaola-workflow-phase4.md` — Worktree Discovery block after line 55

Add block that resolves `ACTIVE_WORKTREE_PATH` from lock file when `KAOLA_WORKTREE_NATIVE=1`. When flag unset, `ACTIVE_WORKTREE_PATH=$(pwd)`.

## `CHANGELOG.md` and `README.md`

Standard entries under `[Unreleased]` for new subcommands and `KAOLA_WORKTREE_NATIVE` env var.

## Build Sequence

### Step 1 (single commit — all must land together to keep `npm test` green)
Files: `scripts/kaola-workflow-claim.js`, `scripts/validate-workflow-contracts.js`, `scripts/simulate-workflow-walkthrough.js`, `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`, `plugins/kaola-workflow/scripts/validate-workflow-contracts.js`, `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`

Validation: `npm test` exits 0

### Step 2 (single commit)
Files: `commands/workflow-next.md`, `commands/kaola-workflow-phase4.md`

Validation: `npm test` exits 0 (new contract asserts `KAOLA_WORKTREE_NATIVE` and `ACTIVE_WORKTREE_PATH` pass)

### Step 3 (single commit)
Files: `CHANGELOG.md`, `README.md`

Validation: `npm test` exits 0

## Task List

| Task | File | Depends On | Group |
|------|------|------------|-------|
| T1–T4: 4 new cmd* functions | scripts/kaola-workflow-claim.js | nothing | A (parallel design, sequential write) |
| T5: main() + exports | scripts/kaola-workflow-claim.js | T1–T4 | A |
| T6: validator asserts | scripts/validate-workflow-contracts.js | T1–T5 | A |
| T7: Epic Case 17 | scripts/simulate-workflow-walkthrough.js | T1–T4 | A (can write parallel to T6) |
| T8: Case 5k | plugins/.../simulate-kaola-workflow-walkthrough.js | T1, T4 | A |
| T9: drift mirrors | plugins/.../kaola-workflow-claim.js + validate | T1–T8 | A (final in commit) |
| T10: phase4 worktree block | commands/kaola-workflow-phase4.md | Step 1 green | B |
| T11: workflow-next guard | commands/workflow-next.md | Step 1 green | B |
| T12: docs | CHANGELOG.md, README.md | Step 2 green | C |

## Integration Risks

1. `getCoordRoot()` in linked worktree: uses `git rev-parse --git-common-dir` which returns common .git from any worktree — safe
2. Epic Case 17B race test: sequential (17A writes branch, 17B checks it offline) — reliable
3. `cmdWorktreeFinalize` dirty-check scope: implementation files outside `kaola-workflow/{project}/` are intentionally allowed dirty
4. `module.exports` extension: safe (no existing caller destructures new names)
5. workflow-next.md line count: must be exactly 250 after +1 insert (verify before commit)
6. Case 5k cleanup: `git worktree prune` before `fs.rmSync` (same as Epic Case 15 pattern)

## Explicit Out-of-Scope

- Phase 1, 2, 3, 5 command files: no worktree path changes
- All existing cmd* function bodies: untouched
- Lock file writes in cmdPickNext: no `.locks/` files written
- `--force-live-takeover` path: unchanged
- `validate-script-sync.js` file list: unchanged
- PR sink: unchanged
