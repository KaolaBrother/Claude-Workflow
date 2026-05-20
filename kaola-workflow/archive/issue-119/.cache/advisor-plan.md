# Advisor Output — Phase 3 Plan Gate — Issue #119

## Overall Verdict
Greenlight. All three Phase 2 verifications resolved with source-confirmed answers. Edits are surgical; return shapes match each `main()`'s reads exactly. Route to Phase 4.

## Concern: Verify `setupRealRepo` Before Writing Tests
Load-bearing assumption: the architect's notes claim `setupRealRepo` inits a repo on `main`, creates the feature branch, then checks back out to `main`, and that `writeWorkflow` lays down `workflow-state.md` (with a Sink block) and `phase6-summary.md` as untracked files in the project dir.

Both new tests' assertions (`git log -1` shows the metadata commit; state file has a Sink block to update) depend on this flow exactly.

**Action (Phase 4 first task):** Read `setupRealRepo` and `writeWorkflow` in `test-gitea-sinks.js` / `test-gitlab-sinks.js` to confirm:
- (a) HEAD is on main when the sink runs
- (b) The project dir + state file exist with a Sink block
- (c) The function-returned `branch` matches the second arg

If any diverges, the test will fail in a misleading way (file-not-found, wrong branch name, empty log).

## Nit 1: GitLab `--root` consistency (do not block)
The existing GitLab sink-merge subprocess tests may use `--root root` instead of `cwd: root`. Mirror whichever pattern the existing tests use. Verify when reading `setupRealRepo`.

## Nit 2: `--merge` gate is untested (do not block)
The new tests don't pass `--merge`, so the `!OFFLINE` guard in each `main()` is uncovered. Low cost to add: extend each subprocess test with `--merge` in argv and assert exit 0 + same placeholder stdout. Without it, a regression that drops the `!OFFLINE` clause would slip through. Worth one extra `spawnSync` call per test.

## No Revision Needed
Write `phase3-plan.md`, route to Phase 4. Carry the `setupRealRepo` read as the first Phase 4 task before any sink-file edit. The two nits can be added during implementation if cheap.
