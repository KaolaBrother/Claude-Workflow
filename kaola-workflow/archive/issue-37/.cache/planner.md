# Planner Output — Issue #37

## Selected Architecture: Approach A — Pure additions, flag at the caller layer

### Why Approach A wins
- Migration plan requires per-project routing (lock file present → legacy; absent → native). A per-project decision is best taken by callers (`workflow-next.md`, phase commands), not pushed into shared subcommands.
- `validate-workflow-contracts.js` lines 220-234 hard-asserts existing function names; pure-add cannot break those strings.
- Drift mirror to `plugins/kaola-workflow/scripts/` becomes a single bottom-of-file append rather than scattered edits.
- New subcommands have their own JSON contracts and don't pollute `cmdStatus` output shape.

### Rejected Alternatives
- **Approach B — wrap old subcommands in flag check inside the script**: Forces churn in every existing function, risks breaking `validate-workflow-contracts.js` string asserts, complicates drift mirror.
- **Approach C — modify existing subcommands to be flag-aware**: Couples old/new semantics; risk of mixed-mode confusion when env leaks; breaks `cmdStatus` JSON contract used in tests.

## New Subcommands to Add (before `main()`, pure additions)

1. **`cmdPickNext`** — list open issues, check `git branch --list 'workflow/issue-*'` + `git ls-remote`, pick first unclaimed, call `provisionWorktree()`, emit JSON `{issue, project, branch, worktree_path, verdict: 'acquired'}`
2. **`cmdResume`** — `git rev-parse --abbrev-ref HEAD`, if matches `workflow/issue-N`, scan phase artifacts, emit `{issue, project, branch, current_phase, next_command}`. If no match, emit `{resumed: false}`.
3. **`cmdWorktreeStatus`** — `git worktree list --porcelain` filtered to `workflow/issue-*`, hydrate with GitHub issue data, emit JSON array.
4. **`cmdWorktreeFinalize`** — dirty check in worktree, copy `{main}/kaola-workflow/{project}/` into `{worktree}/kaola-workflow/{project}/`, commit on worktree branch.

## Caller Wiring

- `commands/workflow-next.md`: wrap existing startup block with `if [ "${KAOLA_WORKTREE_NATIVE:-}" = "1" ]` guard; native path uses `pick-next`/`resume`; legacy path unchanged.
- `commands/kaola-workflow-phase[1-6].md`: gate `ticker` + `verify-startup` behind `if [ "${KAOLA_WORKTREE_NATIVE:-}" != "1" ]`.

## Contract Updates (additive only)

- `scripts/validate-workflow-contracts.js`: add asserts for `function cmdPickNext`, `function cmdResume`, `function cmdWorktreeStatus`, `function cmdWorktreeFinalize`, `KAOLA_WORKTREE_NATIVE`. Do NOT remove lines 220-234 or 278-285.

## Test Updates (additive only)

- `scripts/simulate-workflow-walkthrough.js`: add Epic Case 17 (worktree-native flow). Leave Cases 1, 6G, 13, 14, 14a, 14b untouched.
- `plugins/kaola-workflow/scripts/simulate-kaola-workflow-walkthrough.js`: add Case 5j. Leave 5a-5i untouched.

## Items NOT to Build in This Issue

- Removal of any existing subcommands (`cmdClaim`, `cmdRelease`, `cmdHeartbeat`, etc.)
- Removal of `.locks/`, `.sessions/`, `.tickers/` directories or code
- Rewriting existing test cases 1, 6G, 13, 14, 14a, 14b or Cases 5a-5i
- Removing contract asserts at lines 220-234 or 278-285
- Flipping `KAOLA_WORKTREE_NATIVE` default to enabled
- Modifying `cmdStatus` JSON output shape
- `--native` flag on existing subcommands

## Implementation Order (to keep CI green throughout)

1. Add new subcommands to `scripts/kaola-workflow-claim.js`
2. Wire into `main()` dispatch
3. Add additive asserts to `validate-workflow-contracts.js`
4. Add Epic Case 17 + Case 5j
5. Update `commands/workflow-next.md` with native guard
6. Gate `ticker`/`verify-startup` in all 6 phase commands
7. Mirror to `plugins/kaola-workflow/scripts/kaola-workflow-claim.js`
8. Update CHANGELOG and README

## Missing Facts to Confirm

1. External `cmdStatus` consumers outside this repo — plan assumes none but reviewer should verify
2. `pick-next` push semantics — plan defaults to local-only + `ls-remote` precheck
3. `finalize` vs `worktree-finalize` split interpretation

## Success Criteria

- [ ] `node scripts/simulate-workflow-walkthrough.js` exits 0
- [ ] `node scripts/validate-workflow-contracts.js` passes
- [ ] `diff scripts/kaola-workflow-claim.js plugins/kaola-workflow/scripts/kaola-workflow-claim.js` is empty
- [ ] With `KAOLA_WORKTREE_NATIVE=1 KAOLA_WORKFLOW_OFFLINE=1`, no files under `.locks/`, `.sessions/`, `.tickers/`
- [ ] Legacy path unchanged with flag unset
- [ ] CHANGELOG + README updated
