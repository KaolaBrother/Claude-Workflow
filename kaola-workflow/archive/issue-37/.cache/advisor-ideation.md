# Advisor Gate Output — Issue #37 Phase 2

## Verdict: Ship Approach A

Approach A (pure additions, flag at caller layer) is correct. Confirmed.

## Risks Accuracy

Two items underweighted in the planner:

- **Cross-machine race**: `git ls-remote` is racy by definition. Real backstop is `git worktree add` failing atomically — that's where the test needs to live.
- **`cmdWorktreeFinalize` dirty check scope**: Finalize aborts only on uncommitted changes *under `kaola-workflow/{project}/`*, NOT anywhere in the worktree (Phase 4 will leave the rest dirty by design).

## Gotchas to Address Before Writing Code

### LOCKED DECISIONS (must address in phase2-ideation.md):

1. **`cmdResume` artifact scan location**: Artifacts live in *main* worktree, not issue worktree. If invoked from `.kw/issue-N` cwd, `kaola-workflow/{project}/phase*.md` resolves to wrong directory. Resolution: use `git worktree list --porcelain` (first non-`workflow/*` entry) to locate main worktree, then read artifacts from there. Same applies to `cmdWorktreeFinalize`'s source path.

2. **Phase 4 CWD under native mode**: Orchestrator stays in main. Code edits must land on `workflow/issue-37` in `.kw/issue-N`. Phase 4 skill needs to know to run edits inside `.kw/issue-N` — not handled by this plan. Flag as known follow-up so Phase 3 plans around it.

### ACCEPTABLE DEFERRALS:

3. **Race test in Epic Case 17**: Issue spec calls for "loser retries" race test. Sequential test ("second pick-next skips claimed") accepted for this issue; true concurrent race (two child_process.spawn in parallel) deferred to follow-up.

4. **`workflow:in-progress` label in `cmdPickNext`**: Issue body says "set on worktree creation, cleared on PR merge (derived, not load-bearing)." Include it in `cmdPickNext` to match legacy `cmdClaim` behavior.

5. **`cmdSession` under native mode**: Kept as passive diagnostic; native mode callers ignore its result. Not dead code — `workflow-next.md` uses it for diagnostic output. No changes needed.

## Missed Approaches

None that beat A. Separate file (`scripts/kaola-workflow-worktree.js`) would double drift-guard surface and break the one-entrypoint `main()` convention.
