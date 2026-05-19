# Phase 1 - Research / Discovery: issue-105

## Deliverable
1. Extend `hooks/kaola-workflow-pre-commit.sh` to block commits that stage a live `kaola-workflow/{project}/workflow-state.md` with `status: active` (not `closed`/`abandoned`).
2. Add a guard in `scripts/kaola-workflow-sink-merge.js` (or a pre-merge check callable from Phase 6) that fails loudly if the branch tree for the just-closed project still contains `kaola-workflow/{project}/` instead of `kaola-workflow/archive/{project}/`.
3. Add `testFastE2EMergeFullChain` to `scripts/simulate-workflow-walkthrough.js` covering: startup with `KAOLA_PATH=fast` → `worktree-finalize` → `finalize --keep-worktree` → `sink-merge` → assert `kaola-workflow/archive/issue-N/` exists and `kaola-workflow/issue-N/` is gone.
4. Document (and optionally script) a one-time repair path for already-landed live folders from closed issues #100 and #101.

## Why
Closed fast-path work landed on `main` with `kaola-workflow/issue-N/` (status: active) still present — the archive copy is separate and also committed. This violates the durable state contract, weakens startup/status routing, and can confuse classifier overlap checks. Two real instances already exist (#100, #101).

## Affected Area
- `hooks/kaola-workflow-pre-commit.sh` — lines 30–48; project-count guard; does NOT block single live-folder commits
- `scripts/kaola-workflow-claim.js` — `archiveProjectDir` (lines 410–438), `cmdFinalize` (lines 441–452)
- `scripts/kaola-workflow-sink-merge.js` — `main()` (lines 194–268); no archive awareness; pure git operations
- `commands/kaola-workflow-phase6.md` — Step 8b ordering prescription (lines 489–523); prose only, no code enforcement
- `scripts/simulate-workflow-walkthrough.js` — `testFastStartupState` (lines 461–474) is the only fast-path test; full-path E2E merge test at lines 1014–1084 is the model to mirror

## Key Patterns Found
1. `archiveProjectDir(root, project, statusValue, suffix)` at `kaola-workflow-claim.js:410` — single archive function for all paths; must remain the only archive path; fast-path should not add a separate function
2. `testE2EGitHubMergeFullChain` at `simulate-workflow-walkthrough.js:1014` — canonical E2E merge test shape: startup → worktree-finalize → `finalize --keep-worktree` → sink-merge → assert archive exists and main is clean; mirror this for the fast-path test
3. Pre-commit hook block pattern at `hooks/kaola-workflow-pre-commit.sh:44` — blocks `PROJECT_COUNT > 1`; new guard should read the staged `workflow-state.md` content and check `status:` field before allowing commit

## Test Patterns
- Framework: hand-rolled `assert()` (throws on failure), no external test framework
- Location: `scripts/simulate-workflow-walkthrough.js`
- Structure: `runNode()` / `json()` for offline tests; `runClaimOnline()` / `runClaimOnlineLastJson()` for tests requiring `gh` shim; `KAOLA_WORKFLOW_OFFLINE=1` for unit-level tests; `KAOLA_PATH: 'fast'` extraEnv for fast-path startup
- Execution: `node scripts/simulate-workflow-walkthrough.js` must exit 0

## Config & Env
- `KAOLA_PATH=fast` → sets `workflow_path: fast` and `phase: fast` in `workflow-state.md` at claim time
- `KAOLA_SINK=pr` → disables Step 8b cmdFinalize (archive deferred to `watch-pr`)
- `KAOLA_WORKFLOW_OFFLINE=1` → skips all `gh`/git-push/fetch calls (used in tests)
- `KAOLA_WORKFLOW_FORCE_FF_FAIL` / `KAOLA_WORKFLOW_FORCE_MERGE_IMPOSSIBLE` → test-only env vars in `sink-merge.js`

## External Docs
N/A — all affected code is internal scripts and hooks using stable Node.js fs and shell primitives.

## GitHub Issue
KaolaBrother/Kaola-Workflow#105

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | .cache/docs-lookup.md | Internal patterns sufficient; no external library/API behavior needed |

## Notes / Future Considerations
- The root cause for #100 and #101 is agent ordering error (committed before archiving), not a code bug in `archiveProjectDir` itself. The fix is a code-level guard that makes it impossible to commit with a live folder, regardless of agent ordering.
- For `sink: pr` path, archive happens in `cmdWatchPr` on MERGED — this path is already deferred and working correctly; the new pre-commit guard must not block the initial PR branch commit (which legitimately has a live folder).
- One-time repair for #100 and #101: move live `kaola-workflow/issue-100/` and `kaola-workflow/issue-101/` to `kaola-workflow/archive/` (already exists for both), then commit the deletion. This is a two-commit cleanup on main.
