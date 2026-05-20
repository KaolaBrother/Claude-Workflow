# Phase 6 - Summary: issue-128

## Delivered

Added a clean-worktree guard (2-line inline check) to the GitLab and Gitea `runDirectMerge` production pipelines, matching the GitHub baseline. The guard runs after the OFFLINE-guarded fetch and before `git checkout`, ensuring dirty tracked files cause an explicit `'Worktree must be clean before direct merge sink runs'` error (exit 1) instead of an opaque `git checkout` failure. Added subprocess dirty-worktree tests in both forge test files to prove the guard fires.

## Files Changed

- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` — 2-line guard inserted at lines 302-303
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` — dirty-worktree subprocess test block added
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` — identical 2-line guard inserted at lines 301-302
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` — Test 21 dirty-worktree subprocess test block added
- `CHANGELOG.md` — entry under [Unreleased] ### Fixed

## Test Coverage

Full `npm test` suite: PASS (all 4 forge editions, all walkthroughs, all contract validators)
Targeted: `test-gitlab-sinks.js` → `dirty-worktree guard subprocess test passed`, `GitLab sink tests passed`
Targeted: `test-gitea-sinks.js` → `dirty-worktree guard subprocess test passed`, `Gitea sink tests passed`

## Final Validation Evidence

Command: `npm test` (from worktree `/Volumes/WorkspaceA/ylminiserver/workspace/kaola-workflow.kw/issue-128`)
Result: PASS
Evidence path: `.cache/final-validation.md`

## Documentation Docking

DOCKED — see `.cache/doc-docking.md`
CHANGELOG updated; all other docs have no-impact justification.

## Final Validation Failure Ledger
| Failing Command | Classification | Routed To | Evidence | Status |
|-----------------|----------------|-----------|----------|--------|
| (none) | | | | |

## Follow-Up Items
none — no MEDIUM/LOW review findings, no deferred items from any phase

## Closure Decision
Closure scan found no deferred items, unresolved conflicts, or user-decision items. No advisor consultation required.

## Commit And Push
Feature branch commits:
- `0352e8e` fix(gitlab): add clean-worktree guard before checkout in runDirectMerge
- `ed4a953` fix(gitea): add clean-worktree guard before checkout in runDirectMerge
- `eaec3b1` chore: add CHANGELOG entry for clean-worktree guard parity (issue #128)

Final sink-merge commit hash: pending (reported after push)

## GitHub Issue
KaolaBrother/Kaola-Workflow#128 — will be closed after sink-merge

## Roadmap
Updated after sink-merge

## Archive
Pending — cmdFinalize will archive after sink-merge

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| doc-updater | invoked | .cache/doc-updater.md | |
| documentation docking | invoked | .cache/doc-docking.md | |
| closure advisor gate | N/A | closure scan found no deferred items | no user-decision items or unresolved conflicts |
| final-validation fix executors | N/A | .cache/final-validation-fix-*.md | no failures to fix |
| roadmap refresh | pending | | runs after sink-merge |
| archive completed folder | pending | | runs after sink-merge |
| final commit and push | ready | 3 commits on workflow/issue-128; upstream check pending | |

## Status
READY FOR FINAL GIT GATE
