# Phase 1 - Research / Discovery: issue-32

## Deliverable
Fix three orchestration-layer gaps in the worktree-per-session isolation tree:
1. `doc-updater` must target the linked worktree path, not the main worktree
2. Phase 6 commit gate must copy any phase artifacts from main worktree to linked worktree before staging
3. Walkthrough test suite must clean up synthetic dirs it creates in the live repo root, and `cmdSweep` must prune synthetic test-session lock files

## Why
These gaps required manual intervention during issue #31 finalization. Gap 3 caused a subsequent session to misroute to a test artifact directory as real in-progress work. All three gaps create confusion and toil during normal workflow operation.

## Affected Area
- `scripts/kaola-workflow-claim.js` — `shouldSweep` (line 574), `cmdSweep` (line 1793)
- `scripts/simulate-workflow-walkthrough.js` — spawnSync calls at lines 3994, 4010, 4018 (missing `cwd:`); Epic 8N teardown
- `commands/kaola-workflow-phase6.md` — Step 3 (doc-updater invocation, lines 275-307); Step 8 commit gate (lines 512-531)
- `plugins/kaola-workflow/skills/kaola-workflow-finalize/SKILL.md` — Step 3 doc-updater (line 74); commit gate (lines 136-144)

## Key Patterns Found
1. `coordRoot` vs `root` — `coordRoot` = `git rev-parse --git-common-dir` (shared); `root` = `git rev-parse --show-toplevel` (main worktree only). Lock files use `coordRoot`; workflow-state files use `root`. Gap 2 root is that artifacts are written to `root`, not `wtPath`. [`scripts/kaola-workflow-claim.js:1383`]
2. Lock file is canonical state — `coordRoot/kaola-workflow/.locks/{project}.lock` has `worktree_path` field. Correct detection: read lock `worktree_path`; if non-null and `fs.existsSync`, a linked worktree is active. [`scripts/kaola-workflow-claim.js:1380`]
3. `try/finally` cleanup pattern in tests — `mkdtempSync` + `finally { rmSync(tmp, {recursive:true,force:true}); rmSync(tmp+'.kw', ...) }`. The `.kw` sibling dir must be cleaned too. [`scripts/simulate-workflow-walkthrough.js` Epic 16]
4. Correct `spawnSync` pattern in tests includes `cwd: tmp` — currently missing at lines 3994, 4010, 4018 but present correctly at line 4122. [`scripts/simulate-workflow-walkthrough.js:4122`]
5. Cross-session staging guard in Phase 6 — both files check before any `git add` under `kaola-workflow/{project}/`. Artifact copy must happen before this guard runs. [`commands/kaola-workflow-phase6.md:461-510`]

## Test Patterns
- Framework: hand-rolled assert (no framework)
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: Epic blocks with `try/finally` teardown; `mkdtempSync` for isolation; `KAOLA_WORKFLOW_OFFLINE=1` for GitHub bypasses; new ACs added per gap tested

## Config & Env
- `KAOLA_WORKTREE_PATH` — env var set at claim time pointing to linked worktree path (documented in `.env.example`)
- `KAOLA_COORD_ROOT` — overrides coordRoot resolution (used in AC8 tests to redirect lock writes)
- `KAOLA_WORKFLOW_OFFLINE=1` — disables GitHub API calls in tests
- Lock file field `worktree_path` — canonical source for linked worktree path

## External Docs
N/A — all internal patterns; `git worktree` commands are standard git

## GitHub Issue
KaolaBrother/Kaola-Workflow#32

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | internal patterns sufficient; no external library behavior needed | pure internal Node.js/git changes |

## Notes / Future Considerations
- Gap 2 fix is deliberately placed in Phase 6 Step 8 (not in `cmdClaim`) to avoid breaking the resume path — phases 1-5 all expect `workflow-state.md` in the main worktree
- `shouldSweep` semantics must not change; implement `isSyntheticTestSession` as a separate predicate in `cmdSweep`
- Fallback priority for doc-updater worktree path: (1) lock file `worktree_path` → (2) `KAOLA_WORKTREE_PATH` env → (3) current working directory
