# Phase 3 - Plan: issue-130

## Tasks
1. GitLab claim: add `|bootstrap` to usage string; change `if (sub === 'startup')` to `if (sub === 'bootstrap' || sub === 'startup')`
2. Gitea claim: same pattern
3. GitLab validator: `assertIncludes(pluginRoot + '/scripts/kaola-gitlab-workflow-claim.js', 'bootstrap')`
4. Gitea validator: `assertIncludes(pluginRoot + '/scripts/kaola-gitea-workflow-claim.js', 'bootstrap')`

## Required Agent Compliance
| Requirement | Status | Evidence | Skip Reason |
|-------------|--------|----------|-------------|
| code-architect | N/A | | trivial parity fix |
| advisor plan gate | N/A | | no blueprint gaps |
