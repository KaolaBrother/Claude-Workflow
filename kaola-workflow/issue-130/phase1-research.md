# Phase 1 - Research / Discovery: issue-130

## Deliverable
Add `bootstrap` as an alias for `startup` in GitLab and Gitea claim scripts, matching GitHub parity. Add validator guards.

## Why
GitHub accepts both `bootstrap` and `startup`; GitLab/Gitea only accept `startup`. Users/automation using the older alias will fail silently on GitLab/Gitea.

## Affected Area
- `plugins/kaola-workflow-gitlab/scripts/kaola-gitlab-workflow-claim.js` — usage string + dispatch
- `plugins/kaola-workflow-gitea/scripts/kaola-gitea-workflow-claim.js` — usage string + dispatch
- Both forge validators — `assertIncludes` for bootstrap

## GitHub Issue
KaolaBrother/Kaola-Workflow#130

## Completeness Score
10/10

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-explorer | invoked | .cache/code-explorer.md | |
| docs-lookup | N/A | | internal patterns only |
