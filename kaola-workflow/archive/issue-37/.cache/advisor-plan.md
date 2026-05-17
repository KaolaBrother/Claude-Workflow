# Advisor Gate Output — Issue #37 Phase 3

## Verdict: Proceed to phase3-plan.md

architect-revision-1 correctly addresses all three blocking fixes. Do NOT route to architect-revision-2. Write `phase3-plan.md` now.

## Fixes Confirmed

1. **Fix 1 (cmdWorktreeFinalize lock file removal)**: Correct. `worktreePathFor(root, project)` at line 587 gives a deterministic path with no lock file dependency.
2. **Fix 2 (phase4.md Worktree Discovery block)**: Correct. Inline bash formula `${COORD_ROOT%/}.kw/${KAOLA_PROJECT}` avoids lock file entirely.
3. **Fix 3 (workflow-next.md guard placement)**: Correct. Guard placed after `KAOLA_STARTUP_SESSION=` and before `KAOLA_SINK_FLAG=""`. 248 → 249 lines. No line-count assertion broken.

## Three Items to Verify Before Phase 4 Starts (not blockers for phase3-plan.md)

### 1. `getCoordRoot()` semantics
The revision asserts it uses `git rev-parse --git-common-dir`. This function has not been read yet (only `worktreePathFor` at line 587 was confirmed). If `getCoordRoot` uses `--show-toplevel` instead, then `cmdWorktreeFinalize` invoked from inside the issue worktree would compute `worktreePath = ${issue}.kw/issue-37` (doubly nested) instead of pointing back at the real issue worktree. One grep before Phase 4 implementation settles this.

**Action in Phase 4**: grep `getCoordRoot` body in `scripts/kaola-workflow-claim.js` and verify it returns the repo root regardless of current working directory.

### 2. `KAOLA_PROJECT` env var convention
The Phase 4 Worktree Discovery block references `${KAOLA_PROJECT}` as the project name. This name is not confirmed to be exported by the phase commands — earlier reads did not show this variable. If the convention uses a different name or derives it differently, the fallback `${KAOLA_PROJECT:-${PWD##*/}}` silently resolves to the wrong path.

**Action in Phase 4**: Grep `KAOLA_PROJECT` across `commands/kaola-workflow-phase*.md` and `scripts/`. If unset by convention, change fallback to `:?KAOLA_PROJECT must be set in native mode` for loud failure.

### 3. Phase 4 CWD note for future refactors
`commands/kaola-workflow-phase4.md` uses `git rev-parse --show-toplevel` (not `--git-common-dir`) — safe only as long as the orchestrator stays on main. This is an explicit locked decision. Document in Integration Risks of `phase3-plan.md` so a future refactor doesn't silently break it.

## Epic Case 17F Complexity Warning

Epic Case 17F (worktree-finalize end-to-end) is the highest-complexity test in the plan. Requirements:
- temp git repo initialized
- linked worktree provisioned at the correct path
- fake phase artifacts written to the main worktree's `kaola-workflow/{project}/` directory
- `worktree-finalize` run and asserted to copy files cross-worktree and commit on the issue branch

No existing Epic Cases do cross-worktree state setup at this level of complexity. Phase 3 must call this out explicitly so Phase 4 doesn't underestimate the test scaffolding time. Implementation of Epic Case 17F likely takes 3-4x longer than other sub-cases.
