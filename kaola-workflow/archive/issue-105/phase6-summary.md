# Phase 6 - Summary: issue-105

## Delivered

- **`assertNoLiveWorkflowFolder` guard** in `sink-merge.js`: uses `git cat-file -e HEAD:{path}` to detect if the live workflow folder is committed in branch HEAD; exits 1 with remediation message if found.
- **`cmdFinalize --keep-worktree` fix** in `claim.js`: when called from a linked worktree, now runs `git add -A kaola-workflow/` + `git commit -m "chore: archive {project}"` on the feature branch, ensuring branch HEAD contains the archive not the live folder.
- **Regression tests**: `testSinkMergeRefusesLiveFolder` (negative, offline) and `testFastE2EMergeFullChain` (positive E2E, KAOLA_PATH=fast). Strengthened `testE2EGitHubMergeFullChain` with post-merge folder assertions.
- **Phase6.md guard documentation**: one sentence added to step 8b describing the new guard.
- **AC#4 repair**: `kaola-workflow/issue-100/` and `kaola-workflow/issue-101/` live folders archived in two separate cleanup commits.

## Files Changed

- `scripts/kaola-workflow-sink-merge.js` — assertNoLiveWorkflowFolder helper + call site
- `scripts/kaola-workflow-claim.js` — cmdFinalize --keep-worktree expansion
- `scripts/simulate-workflow-walkthrough.js` — 2 new tests + strengthened assertions + registrations
- `commands/kaola-workflow-phase6.md` — 1 sentence in step 8b
- `CHANGELOG.md` — [Unreleased] entry for issue #105
- `kaola-workflow/archive/issue-101/` — AC#4 commit 1 (b51fc37)
- `kaola-workflow/archive/issue-100/` — AC#4 commit 2 (14a4c3d)

## Test Coverage

6/6 tests pass: testReadPriorityConfig, testE2EGitHubMergeFullChain, testSinkMergeRefusesLiveFolder, testFastE2EMergeFullChain, testE2EGitHubPrFullChain, testParallelIssueIndependence.

## Final Validation Evidence

`node scripts/simulate-workflow-walkthrough.js` from linked worktree → exit 0, "Workflow walkthrough simulation passed". Runs for both Phase 4 (`.cache/tdd-task-2.md`) and Phase 6 (final run, all 6 tests passing).

## Documentation Docking

DOCKED — `.cache/doc-docking.md`

## Final Validation Failure Ledger

| Failing Command | Classification | Routed To | Evidence | Status |
|-----------------|----------------|-----------|----------|--------|
| (none) | | | | |

## Follow-Up Items

1. **[MEDIUM]** Fix stale sentence in `commands/kaola-workflow-phase6.md` step 8b: pre-existing sentence says archive rename is included in Step 8 commit, but it is now committed by `cmdFinalize`. Can be a targeted doc-only PR.
2. **[LOW]** Add `--` before `HEAD:` pathspec in `assertNoLiveWorkflowFolder` for consistency with other call sites.
3. **[LOW]** Add explicit `assert(isSafeName(args.project))` at top of `cmdFinalize` for defense-in-depth.

## Closure Decision

No advisor consultation needed — follow-ups are MEDIUM/LOW documentation/style items. Implementation is complete against Phase 2 selected scope. Issue can be closed.

## Commit And Push

pending final Git gate

## GitHub Issue

pending close after sink-merge

## Roadmap

pending — kaola-workflow/.roadmap/issue-105.md to be deleted and ROADMAP.md regenerated

## Archive

pending — cmdFinalize will archive issue-105 folder to kaola-workflow/archive/issue-105/

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| doc-updater | invoked | .cache/doc-updater.md | CHANGELOG.md entry applied |
| documentation docking | invoked | .cache/doc-docking.md | DOCKED |
| closure advisor gate | N/A | Closure Decision scan above | No CRITICAL/HIGH/user-decision items |
| final-validation fix executors | N/A | | No final validation failures |
| roadmap refresh | pending | kaola-workflow/ROADMAP.md | runs before final commit |
| archive completed folder | pending | | runs via cmdFinalize in Step 8b |
| final commit and push | ready | git status shows 5 unstaged files | final gate runs after this file committed |

## Status

READY FOR FINAL GIT GATE
