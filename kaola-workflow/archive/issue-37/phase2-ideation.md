# Phase 2 - Ideation: issue-37

## Approaches Evaluated

### Option A: Pure additions, flag at caller layer (SELECTED)
- Summary: Add 4 new subcommands (`pick-next`, `resume`, `worktree-status`, `worktree-finalize`) to `kaola-workflow-claim.js` without touching any existing function. All callers (`workflow-next.md`, phase commands) use `KAOLA_WORKTREE_NATIVE=1` guard to route to new vs. legacy path.
- Pros: Zero risk to existing test cases 1/6G/13/14; `validate-workflow-contracts.js` string asserts at lines 220-234 remain intact; drift mirror is one final `cp`; per-project routing is clean (lock file present → legacy, absent → native).
- Cons: Two code paths coexist; slight bloat until cleanup issue removes legacy code.
- Risk: Low
- Complexity: Medium

### Option B: Wrap old subcommands in flag check inside the script
- Summary: Modify each dropped subcommand to check `KAOLA_WORKTREE_NATIVE` and delegate to native implementations.
- Pros: Single unified code path per subcommand.
- Cons: Churn in all 16 existing functions; risks breaking `validate-workflow-contracts.js` string assertions; complicates drift mirror; couples old/new semantics.
- Risk: High
- Complexity: Large

### Option C: Modify existing subcommands to be flag-aware
- Summary: Extend `cmdClaim`, `cmdStatus`, etc. to accept a `--native` flag selecting worktree-based logic.
- Pros: Backwards-compatible CLI surface.
- Cons: Breaks `cmdStatus` JSON contract shape callers depend on; `--native` flag convention conflicts with the "new subcommand" convention already in the codebase; test isolation impossible.
- Risk: High
- Complexity: Large

## Advisor Findings

Approach A confirmed as correct. Two risks in the planner were underweighted:
- Cross-machine race mitigation: `git ls-remote` is racy; real backstop is atomic `git worktree add` failure — test must exercise this.
- `cmdWorktreeFinalize` dirty check scope: abort only on uncommitted changes under `kaola-workflow/{project}/`, not the whole worktree (Phase 4 edits intentionally leave other paths dirty).

Two additional decisions locked per advisor:
1. `cmdResume` must resolve the main worktree path via `git worktree list --porcelain` (first non-`workflow/*` entry) before reading phase artifacts — cwd inside `.kw/issue-N` would otherwise resolve to wrong directory.
2. Phase 4 CWD concern: orchestrator stays on `main`; implementation edits must target `.kw/issue-N`. Flagged as known follow-up for Phase 3 planning.

## Selected Approach

**Option A — pure additions, `KAOLA_WORKTREE_NATIVE=1` flag at caller layer.**

Rationale: Only approach that keeps the existing contract validator and test suite green with purely additive changes. Per-project routing (lock-file-present → legacy, absent → native) maps cleanly to caller guards rather than shared subcommand mutations.

## Locked Implementation Decisions

1. **`cmdPickNext`**: Check `git branch --list 'workflow/issue-*'` + `git ls-remote --heads origin 'workflow/issue-*'` (when online) for claimed issues; call existing `provisionWorktree()`; set `workflow:in-progress` label on the issue; emit JSON `{issue, project, branch, worktree_path, verdict: 'acquired'}`. On `git worktree add` failure, mark lost race and retry next issue.
2. **`cmdResume`**: Derive main worktree path from `git worktree list --porcelain` (first non-`workflow/*` branch entry); read phase artifacts from that path; emit `{issue, project, branch, current_phase, next_command}` or `{resumed: false}`.
3. **`cmdWorktreeFinalize`**: Dirty-check only `kaola-workflow/{project}/` paths in the worktree; copy from main worktree to issue worktree; commit.
4. **`cmdSession`**: Unchanged; kept as passive diagnostic in native mode; callers ignore result.

## Out of Scope (explicit)

- Removal of dropped subcommands (`cmdClaim`, `cmdRelease`, `cmdHeartbeat`, `cmdTicker`, `cmdSweep`, `cmdHandoff`, `cmdCanHandoff`, `cmdVerifyStartup`, `cmdBootstrap`, `cmdStartup`, `cmdDeriveSession`) — follow-up cleanup issue after in-flight queue drains.
- Removal of `.locks/`, `.sessions/`, `.tickers/`, `.runtime/`, `.audit/` directories or their code paths.
- Rewriting Epic Cases 1, 6G, 13, 14, 14a, 14b or plugin Cases 5a-5i — follow-up cleanup.
- Removing contract asserts at `validate-workflow-contracts.js` lines 220-234 or 278-285.
- Flipping `KAOLA_WORKTREE_NATIVE` default to enabled.
- True concurrent race test (two `child_process.spawn` in parallel) — Epic Case 17 uses sequential second-pick-next test; concurrent race test deferred.
- Modifying `cmdStatus` JSON output shape.
- `--native` flag on existing subcommands.
- Cross-machine automated coordination (out of scope per issue spec).

## Known Follow-up for Phase 3

Phase 4 CWD: orchestrator stays on `main`; Phase 4 implementation edits must run inside the `.kw/issue-N` worktree. Phase 3 must produce a task plan that accounts for this — e.g., implementation steps instruct the agent to `cd` into `.kw/issue-N` or use absolute paths to the issue worktree.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| planner | invoked | .cache/planner.md | |
| advisor ideation gate | invoked | .cache/advisor-ideation.md | |
