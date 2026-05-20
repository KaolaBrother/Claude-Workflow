# Phase 1 - Research / Discovery: issue-120

## Deliverable
Port the GitHub `assertNoLiveWorkflowFolder` guard to both Gitea and GitLab direct-merge sinks, and add subprocess tests verifying each sink refuses a branch whose HEAD still contains the live workflow-state.md.

## Why
Gitea and GitLab sinks can currently merge a feature branch that still has the active workflow folder committed (archive-before-merge invariant violated), diverging from the GitHub baseline.

## Affected Area
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js` — add function + call after checkout
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js` — same
- `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` — add Test 20
- `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` — add equivalent test block

## Key Patterns Found
1. GitHub guard: `scripts/kaola-workflow-sink-merge.js:71` — `assertNoLiveWorkflowFolder(mainRoot, project)` uses `git cat-file -e HEAD:<gitPath>` to check if file is in branch HEAD tree; throws Error on detection (exit 1 via main()'s catch block).
2. GitHub enforcement: `scripts/kaola-workflow-sink-merge.js:265` — called immediately after `git checkout <branch>`, before merge-base check.
3. Gitea gap: `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-sink-merge.js:279` — checkout runs, no guard follows.
4. GitLab gap: `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-sink-merge.js:280` — same.
5. Test helper pattern: `setupRepoWithLiveFolderOnBranch` — checks out feature branch, commits `kaola-workflow/{project}/workflow-state.md`, checks back out to main; test then spawns sink with `KAOLA_WORKFLOW_OFFLINE=1` and asserts exit 1 + correct stderr.

## Test Patterns
- Framework: hand-rolled assert (no framework) — same as issue #119
- Location: `plugins/kaola-workflow-gitea/scripts/test-gitea-sinks.js` (Test 20), `plugins/kaola-workflow-gitlab/scripts/test-gitlab-sinks.js` (new block)
- Structure: subprocess test using `spawnSync`, `KAOLA_WORKFLOW_OFFLINE=1` in env, assert exit code 1, assert stderr content

## Config & Env
- No new env vars
- `KAOLA_WORKFLOW_OFFLINE=1` used in tests to avoid network dependencies (same as issue #119 pattern)

## External Docs
None — internal patterns sufficient.

## GitHub Issue
KaolaBrother/Kaola-Workflow#120

## Completeness Score
10/10 — exact insertion points, function source, test helper pattern, and exit code all confirmed from source.

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | — | internal patterns sufficient; no external library/API needed |

## Notes / Future Considerations
None.
