# Phase 6 - Summary: issue-83

## Delivered

Three archive-aware bug fixes for the GitLab merge path, preventing errors when `cmdFinalize` archives `kaola-workflow/{project}/` before Step 9 dispatches sink scripts:

1. **Bug 1** (`sink-merge.js`): Added private `resolveProjectFile(root, project, basename)` helper. `finalValidationPassed` and `readProjectInfo` now check the live path first, fall back to archive, and let the existing try/catch handle truly missing files. Direct merges no longer throw "Final validation evidence is required" after finalize.

2. **Bug 2** (`claim.js`): `cmdSinkFallback` now asserts `isSafeName(args.project)` and checks `fs.existsSync(projectDir(root, args.project))` before calling `updateState`. Returns `{updated: false, reason: 'project archived'}` on archived projects — prevents silent resurrection of archived workflow state.

3. **Bug 3** (`sink-mr.js`): `appendSummary` replaces `fs.mkdirSync({recursive: true})` with `if (!fs.existsSync(path.dirname(summaryFile))) return false`. Archived directories are no longer recreated on the exit-3 fallback path.

## Files Changed

- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js`
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js`
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-mr.js`
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` (6 new unit tests)
- `plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js` (integration test)
- `CHANGELOG.md` (entry under [Unreleased])

## Test Coverage

Unit tests: 6 new test cases in `test-gitlab-sinks.js`
- Bug 1: `testFinalValidationPassedArchived` + `testRunDirectMergeAfterArchive` (indirect `readProjectInfo`)
- Bug 2: `testSinkFallbackSkipsArchivedProject` + `testSinkFallbackLiveDirPresent` + `testSinkFallbackUnsafeName`
- Bug 3: `testAppendSummaryArchivedDir` + `testAppendSummaryPositive`

Integration test: `testFallbackGuardsAfterArchive` in `simulate-gitlab-workflow-walkthrough.js` — archives live dir, runs full dispatch chain, asserts no throws and archive directory unchanged.

Coverage: All three bugs covered by direct tests; `readProjectInfo` tested indirectly via `runDirectMerge` (per Phase 2 decision to avoid API surface expansion).

## Final Validation Evidence

| Command | Result | Evidence |
|---------|--------|----------|
| `node plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` | PASS | .cache/final-validation.md |
| `node plugins/kaola-workflow-gitlab/scripts/simulate-gitlab-workflow-walkthrough.js` | PASS — `testFallbackGuardsAfterArchive: PASSED` | .cache/final-validation.md |
| `node scripts/simulate-workflow-walkthrough.js` | PASS — no regressions | .cache/final-validation.md |

## Documentation Docking

DOCKED — evidence: .cache/doc-docking.md

CHANGELOG.md updated. All other document classes have explicit no-impact reasons (internal bug fixes, no public API/setup/architecture/env changes).

## Final Validation Failure Ledger

| Failing Command | Classification | Routed To | Evidence | Status |
|-----------------|----------------|-----------|----------|--------|
| (none) | — | — | — | — |

## Follow-Up Items

From Phase 5 security review (LOW, non-blocking):
1. **LOW-1**: Add `isSafeName(project)` guard inside `resolveProjectFile` for defense-in-depth
2. **LOW-2**: Tighten `appendSummary` signature to `(root, project, basename)` or remove from exports
3. **LOW-3**: Consider `lstatSync`/`realpathSync` for symlink hardening in `existsSync` guards
4. **INFORMATIONAL**: Branch name sanitization in `runDirectMerge` (pre-existing)

## Closure Decision

Closure scan found no deferred items, unresolved conflicts, or user-decision items within issue-83 scope. The three follow-up LOW/INFORMATIONAL security items are future hardening tasks, not incomplete acceptance criteria. Issue #83 can close. No advisor consultation needed.

## Commit And Push

pending final Git gate — final hash reported after push

## GitHub Issue

pending — will close issue #83 after commit and push

## Roadmap

pending — will delete kaola-workflow/.roadmap/issue-83.md and regenerate ROADMAP.md

## Archive

pending — cmdFinalize will rename kaola-workflow/issue-83/ → kaola-workflow/archive/issue-83/

## Required Agent Compliance

| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| doc-updater | invoked | .cache/doc-updater.md | |
| documentation docking | invoked | .cache/doc-docking.md | |
| closure advisor gate | N/A | closure scan in this summary | No deferred items, conflicts, or user-decision items |
| final-validation fix executors | N/A | — | All validation commands passed; no fixes needed |
| roadmap refresh | pending | kaola-workflow/ROADMAP.md | Will run before final commit |
| archive completed folder | pending | — | cmdFinalize runs in Step 8b |
| final commit and push | ready | git status confirms 6 uncommitted changes | Final gate runs after this file is committed |

## Status
READY FOR FINAL GIT GATE
